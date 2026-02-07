import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  Rocket,
  UserCheck,
  Radio,
  Navigation,
  Wallet,
  Banknote,
  XCircle,
  Star,
  Shield,
  Wrench,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Search,
  AlertTriangle,
  FileWarning,
  CheckCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

interface DriverHelpArticle {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  content: string;
  keywords: string[];
}

interface DriverHelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const CATEGORIES: DriverHelpCategory[] = [
  { id: "getting-started", name: "Getting Started", description: "Begin your driving journey", icon: "rocket" },
  { id: "account-verification", name: "Account & Verification", description: "Documents and account setup", icon: "user-check" },
  { id: "going-online", name: "Going Online & Trips", description: "Accepting and managing rides", icon: "radio" },
  { id: "navigation", name: "Navigation & Maps", description: "Getting around efficiently", icon: "navigation" },
  { id: "payments-earnings", name: "Payments & Earnings", description: "Your earnings and payouts", icon: "wallet" },
  { id: "cash-trips", name: "Cash Trips", description: "Handling cash payments", icon: "banknote" },
  { id: "cancellations", name: "Cancellations & No-Shows", description: "When trips don't happen", icon: "x-circle" },
  { id: "ratings", name: "Ratings & Feedback", description: "Your performance and reviews", icon: "star" },
  { id: "safety", name: "Safety & Support", description: "Stay safe on the road", icon: "shield" },
  { id: "technical", name: "Technical Issues", description: "App troubleshooting", icon: "wrench" },
];

const ARTICLES: DriverHelpArticle[] = [
  {
    id: "gs-1", categoryId: "getting-started", title: "How do I start driving with ZIBA?",
    summary: "Everything you need to know to get on the road",
    content: "Welcome to ZIBA! Getting started is straightforward:\n\n1. Create your account and complete your profile with accurate information.\n2. Submit your required documents (driver's license, vehicle registration, and valid ID).\n3. Wait for our team to verify your documents. We'll notify you once approved.\n4. Once approved, go online and start accepting trip requests.\n\nOur team is here to support you every step of the way. If you have questions during setup, visit the Safety & Support section.",
    keywords: ["start", "begin", "new", "driver", "join", "register", "signup", "how"],
  },
  {
    id: "gs-2", categoryId: "getting-started", title: "What do I need to complete registration?",
    summary: "Required documents and information",
    content: "To complete your ZIBA driver registration, you'll need:\n\n\u2022 A valid driver's license.\n\u2022 Vehicle registration documents.\n\u2022 A government-issued photo ID (e.g., national ID, passport).\n\u2022 A clear profile photo.\n\u2022 Your vehicle details (make, model, year, license plate).\n\nMake sure all documents are clear, legible, and not expired. Blurry or incomplete documents may delay your approval.",
    keywords: ["registration", "documents", "license", "id", "vehicle", "requirements", "need", "complete"],
  },
  {
    id: "gs-3", categoryId: "getting-started", title: "How long does verification take?",
    summary: "Expected timeline for account approval",
    content: "Document verification typically takes 1\u20133 business days. During peak periods, it may take slightly longer.\n\nYou'll receive a notification once your documents are reviewed. If additional information is needed, we'll let you know what to update.\n\nYou can check your verification status anytime from your Profile page.",
    keywords: ["verification", "time", "long", "wait", "approval", "review", "status", "pending"],
  },
  {
    id: "gs-4", categoryId: "getting-started", title: "Can I drive in multiple cities?",
    summary: "Driving in different locations",
    content: "Currently, your ZIBA driver account is set up for your primary operating city. If you'd like to drive in a different city, your account may need to be updated to comply with local requirements.\n\nContact our support team if you're planning to drive in a new area and we'll help you get set up.",
    keywords: ["city", "cities", "multiple", "different", "area", "location", "region", "travel"],
  },
  {
    id: "av-1", categoryId: "account-verification", title: "Why is my account under review?",
    summary: "Understanding the review process",
    content: "Your account may be under review for several reasons:\n\n\u2022 You recently submitted or updated documents.\n\u2022 A routine verification check is in progress.\n\u2022 We need additional information to complete your profile.\n\nDuring review, you won't be able to go online. This is a standard process to ensure safety for everyone. You'll be notified as soon as the review is complete.",
    keywords: ["review", "under", "pending", "status", "why", "account", "hold", "waiting"],
  },
  {
    id: "av-2", categoryId: "account-verification", title: "How do I update my vehicle details?",
    summary: "Changing your vehicle information",
    content: "To update your vehicle details:\n\n1. Go to your Profile page.\n2. Look for the Vehicle Information section.\n3. Update the relevant fields (make, model, license plate, etc.).\n4. Save your changes.\n\nIf you're switching to a completely different vehicle, you may need to submit new registration documents for verification.",
    keywords: ["vehicle", "update", "change", "car", "details", "information", "edit", "modify"],
  },
  {
    id: "av-3", categoryId: "account-verification", title: "What documents are required?",
    summary: "Complete list of required documents",
    content: "ZIBA requires the following documents to verify your driver account:\n\n\u2022 Valid driver's license (not expired).\n\u2022 Vehicle registration certificate.\n\u2022 Government-issued photo ID.\n\u2022 Proof of insurance (where applicable).\n\u2022 A clear, recent profile photo.\n\nAll documents must be clearly readable. Please ensure photos are well-lit and not blurry. Expired documents will not be accepted.",
    keywords: ["documents", "required", "need", "what", "license", "id", "registration", "insurance"],
  },
  {
    id: "av-4", categoryId: "account-verification", title: "How do I change my phone number?",
    summary: "Updating your contact information",
    content: "To change the phone number on your driver account:\n\n1. Contact our support team with your request.\n2. For security, we'll verify your identity before making changes.\n3. Once verified, we'll update your number.\n\nThis process protects your account from unauthorized changes. Please have your current account details ready when contacting support.",
    keywords: ["phone", "number", "change", "contact", "update", "mobile", "cell"],
  },
  {
    id: "go-1", categoryId: "going-online", title: "How do I go online?",
    summary: "Start receiving trip requests",
    content: "To go online and start receiving trip requests:\n\n1. Open the ZIBA Driver app.\n2. From the Home tab, tap the Online/Offline toggle.\n3. Make sure your GPS/location services are enabled.\n4. Once online, you'll start receiving trip requests from nearby riders.\n\nYou can go offline at any time by tapping the toggle again. Remember to only go online when you're ready to accept rides.",
    keywords: ["online", "start", "go", "toggle", "begin", "active", "available", "turn on"],
  },
  {
    id: "go-2", categoryId: "going-online", title: "Why am I not receiving trip requests?",
    summary: "Troubleshooting low trip volume",
    content: "If you're not receiving trip requests, here are some things to check:\n\n\u2022 Make sure you're in an area with rider demand.\n\u2022 Check that your GPS is working correctly and showing your accurate location.\n\u2022 Ensure your internet connection is stable.\n\u2022 Try going offline and back online again.\n\u2022 Check that your app is up to date.\n\nTrip volume can vary based on time of day and location. Peak hours (mornings, evenings, weekends) tend to have more requests.",
    keywords: ["no", "requests", "trips", "receiving", "why", "none", "empty", "waiting", "demand"],
  },
  {
    id: "go-3", categoryId: "going-online", title: "How do I accept or reject a trip?",
    summary: "Handling incoming trip requests",
    content: "When a trip request comes in:\n\n\u2022 You'll see the pickup location and estimated trip details.\n\u2022 Tap \"Accept\" to take the trip. You'll then navigate to the rider's pickup point.\n\u2022 If you're unable to take the trip, it will time out and be offered to another driver.\n\nAccepting trips promptly helps maintain a good acceptance rate, which contributes to your overall standing on the platform.",
    keywords: ["accept", "reject", "trip", "request", "incoming", "decline", "take", "respond"],
  },
  {
    id: "go-4", categoryId: "going-online", title: "What happens after I accept a ride?",
    summary: "The trip flow from acceptance to completion",
    content: "After accepting a ride:\n\n1. Navigate to the rider's pickup location. The app will show you directions.\n2. Once you arrive, tap \"Arrived\" to notify the rider.\n3. Wait for the rider to get in. Confirm the pickup when they're ready.\n4. Follow the route to the destination.\n5. When you arrive at the destination, tap \"Complete Trip.\"\n6. The fare will be calculated and shown to both you and the rider.\n\nIf the rider is paying with cash, collect the fare amount shown in the app.",
    keywords: ["after", "accept", "ride", "flow", "process", "steps", "pickup", "complete", "trip"],
  },
  {
    id: "nav-1", categoryId: "navigation", title: "How does navigation work?",
    summary: "Using the in-app navigation",
    content: "ZIBA provides distance and estimated duration for each trip. For turn-by-turn directions, you can use your preferred map app (Google Maps, Waze, Apple Maps, etc.).\n\nWhen you accept a trip, the app shows the pickup location and destination. Tap the navigation button to open directions in your preferred maps app.\n\nMake sure your GPS is enabled and accurate for the best navigation experience.",
    keywords: ["navigation", "maps", "directions", "route", "gps", "how", "navigate", "turn"],
  },
  {
    id: "nav-2", categoryId: "navigation", title: "Can I use my own map app?",
    summary: "Using Google Maps, Waze, or other navigation apps",
    content: "Yes! ZIBA is designed to work with your preferred navigation app. When you need directions to a pickup or drop-off location, the app can open the route in Google Maps, Waze, Apple Maps, or another navigation app installed on your device.\n\nUsing a familiar navigation app helps you drive confidently and find the best routes.",
    keywords: ["map", "app", "google", "waze", "apple", "own", "preferred", "use", "external"],
  },
  {
    id: "nav-3", categoryId: "navigation", title: "What if GPS is inaccurate?",
    summary: "Handling GPS and location issues",
    content: "If your GPS seems inaccurate:\n\n\u2022 Make sure location services are enabled on your device.\n\u2022 Ensure the app has permission to access your location.\n\u2022 Try restarting the app.\n\u2022 Move to an open area away from tall buildings for a better GPS signal.\n\u2022 Check that your device's location accuracy is set to \"High.\"\n\nGPS accuracy can be affected by tall buildings, tunnels, and areas with poor cellular coverage. If problems persist, contact our support team.",
    keywords: ["gps", "inaccurate", "wrong", "location", "position", "error", "off", "incorrect"],
  },
  {
    id: "nav-4", categoryId: "navigation", title: "What if the rider location is wrong?",
    summary: "When the pickup pin doesn't match",
    content: "Sometimes a rider's pickup pin may not be in the exact right spot. If this happens:\n\n\u2022 Contact the rider through the app to confirm their exact location.\n\u2022 Look for any notes the rider may have added about their pickup spot.\n\u2022 If you can't find or reach the rider, wait at the pin location and try calling.\n\nClear communication with riders helps ensure smooth pickups, especially in busy or hard-to-find locations.",
    keywords: ["rider", "location", "wrong", "pin", "pickup", "find", "where", "incorrect"],
  },
  {
    id: "pe-1", categoryId: "payments-earnings", title: "How do I receive payments?",
    summary: "Understanding how you get paid",
    content: "Your earnings are tracked in your ZIBA wallet. Here's how payments work:\n\n\u2022 For wallet/card trips: Your earnings are added to your wallet balance after each trip.\n\u2022 For cash trips: You collect the fare directly from the rider.\n\nYou can request a payout from your wallet to your bank account or mobile money account at any time. Set up your payout details in the Wallet tab.",
    keywords: ["payment", "receive", "paid", "earnings", "how", "money", "payout", "get"],
  },
  {
    id: "pe-2", categoryId: "payments-earnings", title: "When are payouts processed?",
    summary: "Payout timing and schedule",
    content: "Payouts are processed after you request a withdrawal from your wallet. Processing times may vary depending on your bank or mobile money provider, but typically take 1\u20133 business days.\n\nMake sure your payout details (bank account or mobile money number) are correct and up to date to avoid delays.",
    keywords: ["payout", "when", "processed", "time", "withdrawal", "bank", "transfer", "schedule"],
  },
  {
    id: "pe-3", categoryId: "payments-earnings", title: "Where can I see my earnings?",
    summary: "Finding your earnings breakdown",
    content: "You can view your earnings in the Earnings tab of the driver app:\n\n\u2022 Today: See what you've earned today.\n\u2022 This Week: View your weekly earnings summary.\n\u2022 Last 30 Days: See your monthly earnings overview.\n\nEach trip's fare is also shown in your trip history on the Trips tab. Your wallet balance is always visible in the Wallet tab.",
    keywords: ["earnings", "see", "view", "where", "find", "breakdown", "summary", "income", "how much"],
  },
  {
    id: "pe-4", categoryId: "payments-earnings", title: "Why does my balance look different?",
    summary: "Understanding balance changes",
    content: "Your wallet balance may appear different from expected for a few reasons:\n\n\u2022 A recent payout was processed.\n\u2022 Platform service fees are periodically settled.\n\u2022 Cash trip settlements may be pending.\n\nYou can view your complete transaction history in the Wallet tab to see all credits, debits, and settlements. If something still doesn't look right, contact our support team for a review.",
    keywords: ["balance", "different", "wrong", "changed", "less", "missing", "unexpected", "why"],
  },
  {
    id: "ct-1", categoryId: "cash-trips", title: "How do cash trips work?",
    summary: "Understanding the cash payment process",
    content: "Cash trips are simple:\n\n1. When a rider selects cash as their payment method, you'll see this before accepting the trip.\n2. Complete the trip as normal.\n3. At the end of the trip, collect the fare amount shown in the app directly from the rider.\n\nYou receive the full fare from the rider at the point of collection. Platform service costs are settled separately through periodic statements, so you never lose money at the time of collection.",
    keywords: ["cash", "trip", "how", "work", "payment", "collect", "money", "process"],
  },
  {
    id: "ct-2", categoryId: "cash-trips", title: "When do I collect cash?",
    summary: "The right time to collect payment",
    content: "Collect cash from the rider at the end of the trip, once you've arrived at the destination. The app will show the exact fare amount to both you and the rider.\n\nAlways collect the amount shown in the app. If the rider disagrees with the fare, refer them to the fare shown in their app as well. If there's still a dispute, contact our support team.",
    keywords: ["collect", "cash", "when", "end", "trip", "fare", "amount", "time"],
  },
  {
    id: "ct-3", categoryId: "cash-trips", title: "What if the rider doesn't pay?",
    summary: "Handling non-payment situations",
    content: "If a rider refuses to pay or leaves without paying:\n\n1. Stay calm and do not pursue the rider.\n2. Note down any relevant details about the situation.\n3. Report the incident through the app using the Safety & Support section.\n4. Our support team will investigate the matter.\n\nYour safety is always the priority. Never put yourself in a confrontational situation over payment.",
    keywords: ["rider", "not", "pay", "refuse", "doesn't", "won't", "unpaid", "no payment"],
  },
  {
    id: "ct-4", categoryId: "cash-trips", title: "Can I disable cash trips?",
    summary: "Controlling your cash trip preferences",
    content: "Cash trip preferences may vary by region. In some areas, drivers can choose whether to accept cash trips.\n\nCheck your settings in the Profile or Preferences section to see if this option is available in your operating area. If you have questions about cash trip settings, contact our support team.",
    keywords: ["disable", "cash", "turn off", "stop", "no cash", "preference", "setting", "opt out"],
  },
  {
    id: "cn-1", categoryId: "cancellations", title: "When can I cancel a trip?",
    summary: "Understanding acceptable cancellations",
    content: "You can cancel a trip in certain situations:\n\n\u2022 If the rider is not at the pickup location after a reasonable wait.\n\u2022 If you encounter a safety concern.\n\u2022 If circumstances prevent you from completing the trip safely.\n\nExcessive cancellations without valid reasons may affect your standing. If you need to cancel, always select an appropriate reason in the app to help us understand the situation.",
    keywords: ["cancel", "trip", "when", "can", "allowed", "reason", "ok"],
  },
  {
    id: "cn-2", categoryId: "cancellations", title: "What is a rider no-show?",
    summary: "When riders don't show up",
    content: "A rider no-show is when you arrive at the pickup location and the rider is not there or doesn't respond.\n\nIf the rider doesn't appear after a reasonable waiting period:\n\n1. Try contacting the rider through the app.\n2. Wait at the pickup point.\n3. If the rider still doesn't show, you can cancel the trip and mark it as a no-show.\n\nNo-show cancellations are not counted against your performance.",
    keywords: ["no-show", "noshow", "rider", "not there", "missing", "absent", "waiting", "didn't show"],
  },
  {
    id: "cn-3", categoryId: "cancellations", title: "What happens if a rider cancels?",
    summary: "When riders cancel their request",
    content: "If a rider cancels a trip you've already accepted:\n\n\u2022 You'll be notified immediately.\n\u2022 The trip is removed from your queue.\n\u2022 You'll be available to receive new trip requests.\n\nRiders have a 3-minute grace period after you accept to cancel for free. After 3 minutes, if you've already started heading to the pickup, the rider may be charged a cancellation fee and you may receive compensation for your time and fuel.\n\nRider cancellations do not affect your driver performance. You won't be penalized for cancellations made by riders.",
    keywords: ["rider", "cancels", "cancelled", "canceled", "what happens", "penalty", "grace", "3 minutes", "compensation"],
  },
  {
    id: "cn-4", categoryId: "cancellations", title: "Will cancellations affect my account?",
    summary: "Impact of cancellations on your standing",
    content: "Your cancellation rate is one factor in your overall account standing. Here's what to know:\n\n\u2022 Occasional cancellations with valid reasons are understandable.\n\u2022 Frequent cancellations without good reasons may be reviewed.\n\u2022 Rider cancellations and no-shows are NOT counted against you.\n\nWe understand that sometimes situations arise that require cancellation. We look at the overall pattern, not individual instances.",
    keywords: ["cancellation", "affect", "account", "standing", "penalty", "impact", "rate", "consequence"],
  },
  {
    id: "rt-1", categoryId: "ratings", title: "How do ratings work?",
    summary: "Understanding the rating system",
    content: "After each trip, both you and the rider can rate the experience. Ratings are based on a 5-star scale.\n\nYour overall rating is an average of your recent trip ratings. A high rating shows riders that you provide excellent service.\n\nRatings are designed to help maintain quality and trust on the platform. They're a two-way system \u2014 riders are rated too!",
    keywords: ["rating", "how", "work", "system", "stars", "score", "average"],
  },
  {
    id: "rt-2", categoryId: "ratings", title: "Can I rate riders?",
    summary: "Rating your passengers",
    content: "Yes! After completing a trip, you have the opportunity to rate your rider. Your feedback helps maintain a respectful and safe community for everyone.\n\nRider ratings help the platform identify riders who may need guidance on appropriate behavior. Your honest feedback makes ZIBA better for all drivers.",
    keywords: ["rate", "rider", "passenger", "feedback", "review", "can", "yes"],
  },
  {
    id: "rt-3", categoryId: "ratings", title: "Why did my rating change?",
    summary: "Understanding rating fluctuations",
    content: "Your rating is a rolling average based on your recent trips. It may change because:\n\n\u2022 A new trip rating was added to your average.\n\u2022 An older rating dropped out of the calculation window.\n\nSmall changes are normal and expected. Focus on providing consistent, excellent service and your rating will reflect that over time.",
    keywords: ["rating", "changed", "dropped", "went down", "lower", "different", "why", "fluctuate"],
  },
  {
    id: "rt-4", categoryId: "ratings", title: "How can I improve my rating?",
    summary: "Tips for better performance",
    content: "Here are proven ways to maintain and improve your rating:\n\n\u2022 Keep your vehicle clean and comfortable.\n\u2022 Greet riders warmly and be courteous.\n\u2022 Follow the navigation route and drive safely.\n\u2022 Arrive at the pickup promptly.\n\u2022 Help with luggage when appropriate.\n\u2022 Maintain a professional appearance.\n\nConsistency is key. Small gestures of professionalism go a long way in earning great reviews.",
    keywords: ["improve", "rating", "better", "tips", "increase", "higher", "boost"],
  },
  {
    id: "sf-1", categoryId: "safety", title: "What if I feel unsafe?",
    summary: "Steps to take when you feel at risk",
    content: "Your safety is our top priority. If you feel unsafe during a trip:\n\n1. Use the SOS button in the app to alert our safety team immediately.\n2. If you're in immediate danger, call your local emergency services (e.g., 112 or 911).\n3. Drive to a safe, well-lit, populated area if possible.\n4. Do not confront the rider \u2014 prioritize your personal safety.\n\nOur safety team monitors all SOS alerts and will respond promptly.",
    keywords: ["unsafe", "danger", "emergency", "scared", "threatened", "fear", "help", "sos"],
  },
  {
    id: "sf-2", categoryId: "safety", title: "How do I report an issue?",
    summary: "Filing a report after an incident",
    content: "To report an issue:\n\n1. Go to the Help tab in the driver app.\n2. Tap \"Report an Incident.\"\n3. Select the type of issue.\n4. Provide details about what happened.\n5. Submit your report.\n\nOur support team reviews all reports and will follow up with you. You can also report issues related to specific trips from your trip history.",
    keywords: ["report", "issue", "incident", "problem", "complaint", "file", "submit"],
  },
  {
    id: "sf-3", categoryId: "safety", title: "Can I block a rider?",
    summary: "Preventing future matches with a rider",
    content: "If you've had a negative experience with a rider, you can report the issue through the app. Our safety team will review the situation.\n\nThe platform has systems in place to prevent problematic pairings. When you report a safety concern about a rider, it's taken into account for future trip matching.\n\nYour feedback helps keep the platform safe for everyone.",
    keywords: ["block", "rider", "prevent", "avoid", "match", "again", "ban"],
  },
  {
    id: "sf-4", categoryId: "safety", title: "What happens after I report a problem?",
    summary: "Follow-up on your reports",
    content: "After you submit a report:\n\n1. Our support team receives and reviews your report.\n2. We may contact you for additional details.\n3. We investigate the matter thoroughly.\n4. Appropriate action is taken based on our findings.\n\nYou can check the status of your reports in the Help section. We aim to review all reports as quickly as possible and keep you informed.",
    keywords: ["after", "report", "what happens", "follow", "result", "outcome", "investigation"],
  },
  {
    id: "ti-1", categoryId: "technical", title: "App is not loading",
    summary: "Fixing app loading issues",
    content: "If the ZIBA driver app isn't loading properly:\n\n1. Check your internet connection (Wi-Fi or mobile data).\n2. Close the app completely and reopen it.\n3. Clear your browser cache if using the web version.\n4. Try restarting your device.\n5. Make sure you're using the latest version of the app.\n\nIf the problem persists after these steps, contact our support team with details about what you're experiencing.",
    keywords: ["not loading", "app", "broken", "stuck", "blank", "white screen", "crash", "loading"],
  },
  {
    id: "ti-2", categoryId: "technical", title: "GPS not working",
    summary: "Troubleshooting location services",
    content: "If your GPS isn't working:\n\n1. Make sure location services are turned on in your device settings.\n2. Grant the ZIBA app permission to access your location.\n3. Set location accuracy to \"High\" in your device settings.\n4. Try restarting the app.\n5. Move to an open area for a better satellite signal.\n\nGPS issues can be caused by being indoors, in tunnels, or near tall buildings. If problems continue, restart your device and try again.",
    keywords: ["gps", "not working", "location", "broken", "off", "disabled", "fix"],
  },
  {
    id: "ti-3", categoryId: "technical", title: "Trip ended incorrectly",
    summary: "When a trip doesn't end properly",
    content: "If a trip ended at the wrong time or with an incorrect fare:\n\n1. Check your trip history for the specific trip details.\n2. Note the trip ID and any details about what went wrong.\n3. Contact our support team through the Help section.\n4. Provide the trip ID and explain what happened.\n\nOur team will review the trip data and make corrections if needed. Fare adjustments will be reflected in your wallet.",
    keywords: ["trip", "ended", "incorrectly", "wrong", "fare", "error", "mistake", "early", "late"],
  },
  {
    id: "ti-4", categoryId: "technical", title: "App crashed during a ride",
    summary: "Recovering from an app crash",
    content: "If the app crashes during an active ride:\n\n1. Reopen the app as quickly as possible.\n2. The app should automatically reconnect to your active trip.\n3. Continue the ride as normal.\n\nIf the trip is no longer showing after reopening the app, contact our support team immediately with the trip details. We'll help resolve the situation and ensure your earnings are properly recorded.\n\nPro tip: Keep your device charged and close other apps to reduce the chance of crashes.",
    keywords: ["crash", "crashed", "during", "ride", "frozen", "closed", "app", "stopped"],
  },
];

const DRIVER_SYNONYM_MAP: Record<string, string[]> = {
  money: ["payment", "pay", "cash", "wallet", "earnings", "payout", "balance", "income", "fare"],
  pay: ["payment", "cash", "wallet", "money", "earnings", "payout", "receive"],
  earnings: ["money", "income", "pay", "payment", "balance", "fare", "payout"],
  trip: ["ride", "request", "journey", "booking"],
  ride: ["trip", "request", "journey", "booking"],
  cancel: ["cancelled", "canceled", "stop", "abort", "decline"],
  problem: ["issue", "error", "bug", "broken", "not working", "help", "trouble"],
  safe: ["safety", "security", "emergency", "sos", "danger", "protect"],
  rate: ["rating", "star", "score", "review", "feedback"],
  rating: ["rate", "star", "score", "review", "feedback"],
  gps: ["location", "maps", "navigation", "position", "direction"],
  map: ["navigation", "gps", "directions", "route"],
  online: ["available", "active", "start", "begin", "go"],
  cash: ["money", "payment", "collect", "fare"],
  payout: ["withdrawal", "bank", "transfer", "money", "earnings"],
  document: ["documents", "license", "id", "registration", "verification", "papers"],
  verify: ["verification", "review", "approved", "documents", "check"],
  crash: ["frozen", "stopped", "not working", "broken", "bug"],
  block: ["prevent", "avoid", "ban", "rider"],
  lost: ["missing", "forgot", "left"],
};

function driverFuzzySearch(query: string, articles: DriverHelpArticle[]): DriverHelpArticle[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
  const expandedWords = new Set<string>(queryWords);

  for (let i = 0; i < queryWords.length; i++) {
    const word = queryWords[i];
    if (DRIVER_SYNONYM_MAP[word]) {
      DRIVER_SYNONYM_MAP[word].forEach(syn => expandedWords.add(syn));
    }
    const entries = Object.entries(DRIVER_SYNONYM_MAP);
    for (let j = 0; j < entries.length; j++) {
      const [key, synonyms] = entries[j];
      if (synonyms.includes(word)) {
        expandedWords.add(key);
        synonyms.forEach(syn => expandedWords.add(syn));
      }
    }
  }

  const expandedArray = Array.from(expandedWords);

  const scored = articles.map(article => {
    let score = 0;
    const titleLower = article.title.toLowerCase();
    const summaryLower = article.summary.toLowerCase();
    const contentLower = article.content.toLowerCase();

    if (titleLower.includes(normalizedQuery)) score += 100;
    if (summaryLower.includes(normalizedQuery)) score += 50;

    for (let i = 0; i < expandedArray.length; i++) {
      const word = expandedArray[i];
      if (titleLower.includes(word)) score += 20;
      if (summaryLower.includes(word)) score += 10;
      if (article.keywords.some(k => k.includes(word) || word.includes(k))) score += 15;
      if (contentLower.includes(word)) score += 5;
    }

    return { article, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const results = scored.filter(s => s.score > 0);

  if (results.length === 0) {
    return scored.slice(0, 3).map(s => s.article);
  }

  return results.slice(0, 8).map(s => s.article);
}

const CATEGORY_ICONS: Record<string, typeof Rocket> = {
  rocket: Rocket,
  "user-check": UserCheck,
  radio: Radio,
  navigation: Navigation,
  wallet: Wallet,
  banknote: Banknote,
  "x-circle": XCircle,
  star: Star,
  shield: Shield,
  wrench: Wrench,
};

interface SafetyIncident {
  id: string;
  incidentType: string;
  severity: string;
  status: string;
  createdAt: string;
}

type ViewState = "home" | "category" | "article";

export default function DriverHelpPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewState>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<DriverHelpCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<DriverHelpArticle | null>(null);

  const { data: incidents = [] } = useQuery<SafetyIncident[]>({
    queryKey: ["/api/safety/incidents/mine"],
    enabled: !!user,
  });

  const categoryArticles = useMemo(() => {
    if (!selectedCategory) return [];
    return ARTICLES.filter(a => a.categoryId === selectedCategory.id);
  }, [selectedCategory]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return driverFuzzySearch(searchQuery, ARTICLES);
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 1;

  const handleCategoryClick = (category: DriverHelpCategory) => {
    setSelectedCategory(category);
    setView("category");
  };

  const handleArticleClick = (article: DriverHelpArticle) => {
    setSelectedArticle(article);
    setView("article");
  };

  const handleBack = () => {
    if (view === "article") {
      if (selectedCategory) {
        setView("category");
      } else {
        setView("home");
        setSearchQuery("");
      }
      setSelectedArticle(null);
    } else if (view === "category") {
      setView("home");
      setSelectedCategory(null);
    }
  };

  const getCategoryForArticle = (article: DriverHelpArticle) => {
    return CATEGORIES.find(c => c.id === article.categoryId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Resolved</Badge>;
      case "under_review":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Under Review</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{status}</Badge>;
    }
  };

  if (view === "article" && selectedArticle) {
    const articleCategory = getCategoryForArticle(selectedArticle);
    return (
      <DriverLayout>
        <div className="max-w-3xl mx-auto p-4 space-y-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            data-testid="button-back-from-article"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div>
            {articleCategory && (
              <Badge variant="secondary" data-testid="badge-article-category">
                {articleCategory.name}
              </Badge>
            )}
            <h1 className="text-2xl font-bold mt-2" data-testid="text-article-title">
              {selectedArticle.title}
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-article-summary">
              {selectedArticle.summary}
            </p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="space-y-3 text-sm leading-relaxed" data-testid="text-article-content">
                {selectedArticle.content.split("\n\n").map((paragraph, i) => (
                  <p key={i} style={{ whiteSpace: "pre-line" }}>{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Still need help?{" "}
                <button
                  className="text-primary underline"
                  onClick={() => { setView("home"); setSelectedArticle(null); setSelectedCategory(null); setSearchQuery(""); }}
                  data-testid="link-back-to-help"
                >
                  Browse more topics
                </button>{" "}
                or contact our support team.
              </p>
            </CardContent>
          </Card>
        </div>
      </DriverLayout>
    );
  }

  if (view === "category" && selectedCategory) {
    const Icon = CATEGORY_ICONS[selectedCategory.icon] || HelpCircle;
    return (
      <DriverLayout>
        <div className="max-w-3xl mx-auto p-4 space-y-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            data-testid="button-back-from-category"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-category-title">
                {selectedCategory.name}
              </h1>
              <p className="text-muted-foreground text-sm" data-testid="text-category-description">
                {selectedCategory.description}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {categoryArticles.map((article) => (
              <Card
                key={article.id}
                className="hover-elevate cursor-pointer"
                onClick={() => handleArticleClick(article)}
                data-testid={`card-article-${article.id}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium" data-testid={`text-article-title-${article.id}`}>
                      {article.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {article.summary}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="text-center space-y-2">
          <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold" data-testid="text-help-title">Driver Help Center</h1>
          <p className="text-muted-foreground text-sm">Find answers to your questions</p>
        </div>

        <div className="relative" data-testid="search-container">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {isSearching ? (
          <div className="space-y-3">
            {searchResults.length > 0 && (
              <p className="text-sm text-muted-foreground" data-testid="text-search-hint">
                {ARTICLES.some(a =>
                  a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.summary.toLowerCase().includes(searchQuery.toLowerCase())
                )
                  ? `${searchResults.length} result${searchResults.length === 1 ? "" : "s"} found`
                  : "Here's something that may help."}
              </p>
            )}
            {searchResults.map((article) => {
              const cat = getCategoryForArticle(article);
              return (
                <Card
                  key={article.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => {
                    setSelectedCategory(null);
                    handleArticleClick(article);
                  }}
                  data-testid={`card-search-result-${article.id}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium" data-testid={`text-search-title-${article.id}`}>
                          {article.title}
                        </p>
                        {cat && (
                          <Badge variant="secondary" className="text-xs">
                            {cat.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {article.summary}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <>
            <Card data-testid="card-safety-center">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-destructive" />
                  Safety Center
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm">Trip recording</span>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setLocation("/driver/dashboard")}
                  data-testid="button-sos-help"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  SOS - Emergency Help
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  data-testid="button-report-incident"
                >
                  <FileWarning className="h-4 w-4 mr-2" />
                  Report an Incident
                </Button>
              </CardContent>
            </Card>

            {incidents.length > 0 && (
              <Card data-testid="card-incident-history">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileWarning className="h-4 w-4" />
                    Report History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {incidents.slice(0, 5).map((incident) => (
                    <div key={incident.id} className="flex items-center justify-between gap-2" data-testid={`incident-${incident.id}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{incident.incidentType.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(incident.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(incident.status)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <h2 className="text-lg font-semibold" data-testid="text-categories-title">
                Browse Topics
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category.icon] || HelpCircle;
                  return (
                    <Card
                      key={category.id}
                      className="hover-elevate cursor-pointer"
                      onClick={() => handleCategoryClick(category)}
                      data-testid={`card-category-${category.id}`}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <p className="font-medium text-sm" data-testid={`text-category-name-${category.id}`}>
                          {category.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {category.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </DriverLayout>
  );
}
