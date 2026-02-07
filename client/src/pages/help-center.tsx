import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Rocket,
  Car,
  Wallet,
  Banknote,
  Clock,
  Shield,
  User,
  Wrench,
} from "lucide-react";

interface HelpArticle {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  content: string;
  keywords: string[];
}

interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const CATEGORIES: HelpCategory[] = [
  { id: "getting-started", name: "Getting Started", description: "New to ZIBA? Start here", icon: "rocket" },
  { id: "booking", name: "Booking a Ride", description: "How to request and manage rides", icon: "car" },
  { id: "payments", name: "Payments & Wallet", description: "Payment methods and wallet info", icon: "wallet" },
  { id: "cash", name: "Cash Trips", description: "Paying your driver with cash", icon: "banknote" },
  { id: "trips", name: "Trips & Cancellations", description: "Trip status and cancellation info", icon: "clock" },
  { id: "safety", name: "Safety & Trust", description: "How we keep you safe", icon: "shield" },
  { id: "account", name: "Account & Profile", description: "Manage your account settings", icon: "user" },
  { id: "problems", name: "Problems & Support", description: "Get help with issues", icon: "wrench" },
];

const ARTICLES: HelpArticle[] = [
  {
    id: "gs-1", categoryId: "getting-started", title: "What is ZIBA?",
    summary: "Learn about the ZIBA ride-hailing platform",
    content: "ZIBA is a ride-hailing platform designed for emerging markets. We connect riders with trusted, verified drivers so you can get where you need to go safely and reliably. Whether you're commuting to work, running errands, or heading out for the evening, ZIBA makes it easy to request a ride from your phone.",
    keywords: ["what", "ziba", "about", "platform", "app", "service"],
  },
  {
    id: "gs-2", categoryId: "getting-started", title: "How do I book my first ride?",
    summary: "Step-by-step guide to your first trip",
    content: "Booking your first ride is simple:\n\n1. Open the ZIBA app and you'll see the \"Where are you going?\" screen.\n2. Enter your pickup location in the first field.\n3. Enter your destination in the second field.\n4. Choose your payment method (cash or wallet).\n5. Tap \"Request Ride\" and a nearby driver will be matched with you.\n\nYou'll be able to see your driver's details and track their arrival in real time.",
    keywords: ["first", "ride", "book", "start", "begin", "new", "how"],
  },
  {
    id: "gs-3", categoryId: "getting-started", title: "Is ZIBA available in my city?",
    summary: "Check where ZIBA operates",
    content: "ZIBA is currently expanding across several countries in Africa and other emerging markets. We operate in major cities across Nigeria and are actively launching in new regions. Check the app for availability in your area — if ZIBA is available, you'll be able to see nearby drivers and request rides.",
    keywords: ["city", "available", "location", "area", "country", "where", "operate", "nigeria"],
  },
  {
    id: "gs-4", categoryId: "getting-started", title: "How do I create an account?",
    summary: "Setting up your ZIBA account",
    content: "Creating your ZIBA account takes just a moment:\n\n1. Open the ZIBA app or visit our website.\n2. Tap \"Sign In\" to create your account.\n3. You'll be guided through a quick setup process.\n4. Once signed in, you can start requesting rides right away.\n\nYour account gives you access to ride history, saved places, wallet features, and more.",
    keywords: ["create", "account", "sign", "register", "setup", "new"],
  },
  {
    id: "bk-1", categoryId: "booking", title: "How do I request a ride?",
    summary: "Quick guide to requesting a ride",
    content: "To request a ride:\n\n1. Open the app and go to the Home screen.\n2. Enter your pickup location (or use your current location).\n3. Enter your destination.\n4. Select your preferred payment method.\n5. Tap \"Request Ride\".\n\nThe app will find the nearest available driver and match you. You'll see the driver's name, vehicle details, and estimated arrival time.",
    keywords: ["request", "ride", "book", "order", "get", "how", "hail"],
  },
  {
    id: "bk-2", categoryId: "booking", title: "How do I change my pickup or drop-off?",
    summary: "Updating your ride locations",
    content: "You can change your pickup or drop-off location before requesting a ride by simply editing the text in the pickup or destination fields on the home screen.\n\nIf you've already requested a ride, contact your driver directly to discuss any changes to the route. Please note that changes to the route may affect the final fare.",
    keywords: ["change", "pickup", "dropoff", "drop-off", "destination", "location", "edit", "update", "address"],
  },
  {
    id: "bk-3", categoryId: "booking", title: "Can I schedule a ride?",
    summary: "Book rides in advance",
    content: "Yes! ZIBA allows you to schedule rides in advance. On the home screen, look for the \"Schedule a Ride\" option. You can set your pickup time and location ahead of time, and we'll match you with a driver when your ride time arrives.\n\nScheduled rides are a great option for airport trips, early morning commutes, or any time you want to plan ahead.",
    keywords: ["schedule", "advance", "book", "plan", "future", "reserve", "ahead", "later", "tomorrow"],
  },
  {
    id: "bk-4", categoryId: "booking", title: "What happens after I request a ride?",
    summary: "Understanding the ride matching process",
    content: "After you request a ride, here's what happens:\n\n1. The app searches for available drivers near your pickup location.\n2. A driver is matched with your ride request.\n3. You'll see the driver's name, photo, vehicle details, and estimated arrival time.\n4. The driver heads to your pickup location.\n5. Once the driver arrives, you'll be notified.\n6. Get in, enjoy your ride, and you'll be notified when you arrive at your destination.",
    keywords: ["after", "request", "match", "driver", "wait", "status", "process"],
  },
  {
    id: "pw-1", categoryId: "payments", title: "What payment methods are supported?",
    summary: "Available ways to pay for rides",
    content: "ZIBA supports two ways to pay for rides:\n\n\u2022 Cash: Pay your driver directly at the end of the trip.\n\u2022 Wallet: Use your ZIBA wallet balance to pay for rides seamlessly in the app.\n\nYou can add money to your wallet using a debit or credit card through our secure payment partner. Cards are used to fund your wallet — trip payments are made from your wallet balance or with cash.\n\nYou can switch between payment methods at any time from the Payments screen before requesting a ride.",
    keywords: ["payment", "method", "pay", "options", "supported", "types", "card", "cash", "wallet", "money"],
  },
  {
    id: "pw-2", categoryId: "payments", title: "How do I switch payment methods?",
    summary: "Change how you pay for rides",
    content: "To switch your payment method:\n\n1. On the Home screen, tap the payment method button (below the destination field).\n2. You'll see all available payment options.\n3. Tap your preferred method to select it.\n\nYou can also go to the Wallet tab and tap on payment options to change your default method. Your selected payment method will be used for your next ride.",
    keywords: ["switch", "change", "payment", "method", "select", "choose", "default"],
  },
  {
    id: "pw-3", categoryId: "payments", title: "Why is my wallet balance zero?",
    summary: "Understanding your wallet balance",
    content: "If your wallet balance shows zero, it may be because:\n\n\u2022 You haven't added funds to your wallet yet.\n\u2022 You recently used your balance for a ride.\n\nTo add funds, go to the Payments screen and tap \"Fund Wallet\". You can use your debit or credit card to add money instantly. Quick-amount buttons (like 500, 1000, 2000, 5000) make it easy to top up.\n\nYou can also take rides using cash — just select \"Cash\" as your payment method before requesting a ride.",
    keywords: ["wallet", "balance", "zero", "empty", "no money", "0", "funds", "low"],
  },
  {
    id: "pw-4", categoryId: "payments", title: "How do I add money to my wallet?",
    summary: "Fund your wallet with a card",
    content: "Adding money to your ZIBA wallet is quick and easy:\n\n1. Go to the Payments screen from the bottom navigation.\n2. Tap \"Fund Wallet\".\n3. Enter the amount you'd like to add, or tap a quick-amount button.\n4. Complete the payment through our secure payment partner.\n\nYour wallet balance will be updated once the payment is confirmed. Cards are used only to fund your wallet — they are not charged directly for trips.",
    keywords: ["add", "fund", "wallet", "money", "card", "top", "up", "topup", "credit", "debit", "deposit"],
  },
  {
    id: "pw-5", categoryId: "payments", title: "Is my card information secure?",
    summary: "Card and payment security",
    content: "Yes. All card transactions are processed through our trusted, encrypted payment partner. Your card details are never stored on ZIBA's servers. All payment data is handled according to industry-standard security practices.\n\nCards are used only to fund your wallet balance — no card details are used during individual trips.",
    keywords: ["card", "secure", "security", "safe", "encrypted", "payment", "credit", "debit"],
  },
  {
    id: "pw-6", categoryId: "payments", title: "What is Auto Top-Up?",
    summary: "Automatically keep your wallet funded",
    content: "Auto Top-Up automatically adds money to your wallet whenever your balance drops below a set amount. This way, you never run out of balance during a trip.\n\nTo set it up:\n\n1. Go to your Wallet screen.\n2. Find the Auto Top-Up section.\n3. Turn on the toggle.\n4. Set your preferred threshold (minimum balance before top-up triggers) and the amount to add.\n5. Save your settings.\n\nFor example, if you set the threshold to 500 and the top-up amount to 1,000, your wallet will automatically be topped up with 1,000 whenever your balance falls below 500.\n\nIf the auto top-up fails 3 times in a row, it will be paused automatically. You can re-enable it at any time from the Wallet screen.",
    keywords: ["auto", "top", "up", "automatic", "topup", "refill", "threshold", "low", "balance"],
  },
  {
    id: "pw-7", categoryId: "payments", title: "What are cancellation fees?",
    summary: "When you may be charged for cancelling",
    content: "If you cancel a ride after the 3-minute grace period and your driver is already on the way or has arrived, a cancellation fee may be deducted from your wallet.\n\n\u2022 If the driver is on the way: A standard cancellation fee applies.\n\u2022 If the driver has arrived at your location: A higher fee applies, since the driver has already reached you.\n\nThe app will warn you about any potential fees before you confirm the cancellation. If you cancel within 3 minutes of the driver accepting, there is no charge.\n\nCancellation fees are deducted from your wallet balance. If your wallet doesn't have enough funds, the remaining amount may be recorded as a balance owed.",
    keywords: ["cancellation", "fee", "charge", "cancel", "cost", "wallet", "deducted", "grace", "period"],
  },
  {
    id: "cs-1", categoryId: "cash", title: "How does paying with cash work?",
    summary: "Everything about cash payments",
    content: "Paying with cash is simple:\n\n1. Select \"Cash\" as your payment method before requesting a ride.\n2. Complete your trip as normal.\n3. At the end of the trip, pay the driver the fare amount shown in the app.\n\nCash is a great option if you prefer not to use digital payments. The exact fare will be displayed in the app so you know exactly how much to pay.",
    keywords: ["cash", "pay", "driver", "how", "work", "money", "physical"],
  },
  {
    id: "cs-2", categoryId: "cash", title: "When do I pay the driver?",
    summary: "When to hand over payment",
    content: "You pay the driver at the end of the trip, once you've arrived at your destination. The app will show the total fare, and you simply hand the cash to your driver before exiting the vehicle.\n\nPlease try to have the correct amount ready to make the process smooth for both you and your driver.",
    keywords: ["when", "pay", "driver", "end", "trip", "arrive", "destination", "fare"],
  },
  {
    id: "cs-3", categoryId: "cash", title: "What if I don't have exact cash?",
    summary: "Handling change during cash trips",
    content: "If you don't have the exact fare amount, your driver may be able to provide change, but this isn't guaranteed. We recommend:\n\n\u2022 Having the approximate fare amount ready in smaller bills.\n\u2022 Checking the estimated fare before requesting a ride so you can prepare.\n\u2022 Considering using your ZIBA wallet as an alternative payment method.\n\nIf there are any issues with payment, you can contact our support team for help.",
    keywords: ["exact", "change", "cash", "bills", "small", "money", "denomination"],
  },
  {
    id: "cs-4", categoryId: "cash", title: "Can I switch from cash to wallet?",
    summary: "Changing from cash to another payment method",
    content: "You can switch between cash and wallet before requesting a ride. Simply go to the Home screen, tap the payment method button, and select a different option.\n\nPlease note that once a ride is in progress with cash selected, you cannot switch to another payment method for that trip. Make sure to choose your preferred method before requesting your ride.\n\nIf you'd like to use your wallet, make sure it has enough balance. You can top up anytime using a card via the \"Fund Wallet\" button on the Payments screen.",
    keywords: ["switch", "cash", "wallet", "change", "before", "during", "payment", "fund"],
  },
  {
    id: "tc-1", categoryId: "trips", title: "Can I cancel a ride?",
    summary: "How to cancel a ride request",
    content: "Yes, you can cancel a ride after requesting it.\n\n\u2022 Before a driver accepts: Cancellation is always free.\n\u2022 Within 3 minutes after a driver accepts: Cancellation is free — this is your grace period to change your mind.\n\u2022 After the 3-minute grace period: A cancellation fee may apply, especially if the driver has already started heading to your pickup location.\n\nTo cancel, open the active trip screen and look for the cancel option. The app will let you know if any fees apply before you confirm.",
    keywords: ["cancel", "ride", "trip", "stop", "abort", "end", "quit", "fee", "free", "grace", "3 minutes"],
  },
  {
    id: "tc-2", categoryId: "trips", title: "What happens if a driver cancels?",
    summary: "When your driver cancels the trip",
    content: "If a driver cancels your ride, don't worry \u2014 the app will automatically try to find another available driver for you. You'll be notified of the cancellation and can either wait for a new match or request a new ride.\n\nIf your wallet was charged for the cancelled ride, any charges will be refunded to your account.",
    keywords: ["driver", "cancel", "cancelled", "another", "new", "refund"],
  },
  {
    id: "tc-3", categoryId: "trips", title: "Why was my ride canceled?",
    summary: "Understanding ride cancellations",
    content: "Rides may be canceled for several reasons:\n\n\u2022 You canceled the ride yourself.\n\u2022 The driver canceled due to being unable to reach your pickup location.\n\u2022 No drivers were available in your area at the time.\n\u2022 There was a safety concern flagged by our system.\n\nRemember: If a driver has already accepted your ride, you have a 3-minute grace period to cancel for free. After that, a cancellation fee may apply.\n\nIf you believe your ride was canceled in error, please contact our support team and we'll be happy to look into it.",
    keywords: ["why", "canceled", "cancelled", "reason", "explanation", "fee", "grace"],
  },
  {
    id: "tc-4", categoryId: "trips", title: "What if my driver doesn't arrive?",
    summary: "When your driver is late or missing",
    content: "If your driver hasn't arrived within a reasonable time:\n\n1. Check the app for the driver's current location and estimated arrival time.\n2. Try contacting the driver through the app.\n3. If you're unable to reach the driver, you can cancel the ride and request a new one.\n\nIf this happens repeatedly, please reach out to our support team so we can investigate and ensure you have a better experience.",
    keywords: ["driver", "arrive", "late", "missing", "no show", "waiting", "long", "time"],
  },
  {
    id: "sf-1", categoryId: "safety", title: "How does ZIBA keep riders safe?",
    summary: "Our safety measures for riders",
    content: "Your safety is our top priority. Here's how we keep you protected:\n\n\u2022 All drivers go through a verification process before being approved.\n\u2022 You can see your driver's details and vehicle information before the trip.\n\u2022 Real-time trip tracking lets you and your trusted contacts follow your ride.\n\u2022 An in-app SOS button is available during trips for emergencies.\n\u2022 Our rating system helps maintain high standards for driver behavior.\n\u2022 Our support team is available to help with any safety concerns.",
    keywords: ["safe", "safety", "protect", "security", "trust", "secure", "verification"],
  },
  {
    id: "sf-2", categoryId: "safety", title: "Can I share my trip?",
    summary: "Sharing your trip details with others",
    content: "Yes! ZIBA allows you to share your trip details with trusted contacts. During an active trip, you can share your real-time location and trip information so someone you trust can follow your journey.\n\nThis is a great feature to use, especially for late-night rides or trips to unfamiliar areas. Your safety and peace of mind matter to us.",
    keywords: ["share", "trip", "contact", "track", "location", "family", "friend"],
  },
  {
    id: "sf-3", categoryId: "safety", title: "What should I do in an emergency?",
    summary: "Emergency steps during a ride",
    content: "If you're in an emergency during a ride:\n\n1. Use the SOS button in the app to alert our safety team immediately.\n2. If you're in immediate danger, call your local emergency services (e.g., 112 or 911).\n3. If possible, share your trip with a trusted contact.\n\nOur safety team monitors SOS alerts and will respond as quickly as possible. Your safety is always our highest priority.",
    keywords: ["emergency", "sos", "danger", "help", "urgent", "police", "911", "112", "accident"],
  },
  {
    id: "sf-4", categoryId: "safety", title: "How are drivers verified?",
    summary: "Our driver verification process",
    content: "All ZIBA drivers go through a thorough verification process that includes:\n\n\u2022 Identity verification with valid government-issued ID.\n\u2022 Vehicle documentation check.\n\u2022 Driver's license verification.\n\u2022 Profile photo verification.\n\nDrivers must be approved before they can accept ride requests. We continuously monitor driver performance through ratings and feedback to maintain quality and safety standards.",
    keywords: ["driver", "verified", "verification", "check", "background", "approved", "license", "id"],
  },
  {
    id: "ac-1", categoryId: "account", title: "How do I update my profile?",
    summary: "Editing your account information",
    content: "To update your profile:\n\n1. Go to the Profile tab in the bottom navigation.\n2. You'll see your current profile information.\n3. Tap on the fields you'd like to update.\n4. Save your changes.\n\nKeeping your profile up to date helps drivers identify you and ensures smooth communication.",
    keywords: ["update", "profile", "edit", "change", "name", "info", "information", "details"],
  },
  {
    id: "ac-2", categoryId: "account", title: "How do I change my phone number?",
    summary: "Updating your contact number",
    content: "To change the phone number associated with your account, please contact our support team. For security reasons, phone number changes require verification to protect your account.\n\nYou can reach our support team through the app or by visiting the Problems & Support section of the Help Center.",
    keywords: ["phone", "number", "change", "mobile", "contact", "update", "cell"],
  },
  {
    id: "ac-3", categoryId: "account", title: "How do I log out?",
    summary: "Signing out of your account",
    content: "To log out of your ZIBA account:\n\n1. Go to the Profile tab.\n2. Scroll down to find the \"Log Out\" or \"Sign Out\" option.\n3. Tap it to sign out.\n\nYou can log back in at any time using your account credentials. Your ride history and wallet balance will be saved.",
    keywords: ["log", "out", "sign", "logout", "signout", "exit"],
  },
  {
    id: "ac-4", categoryId: "account", title: "I forgot my password",
    summary: "Recovering your account access",
    content: "ZIBA uses a secure sign-in system that doesn't require a traditional password. If you're having trouble signing into your account:\n\n1. Try signing in again from the login screen.\n2. Make sure you're using the same sign-in method you originally used.\n3. If you're still having trouble, contact our support team for assistance.\n\nWe'll help you get back into your account as quickly as possible.",
    keywords: ["forgot", "password", "reset", "login", "sign", "access", "locked", "cant"],
  },
  {
    id: "ps-1", categoryId: "problems", title: "I was charged incorrectly",
    summary: "Reporting a fare or billing issue",
    content: "If you believe you were charged incorrectly for a ride:\n\n1. Check your ride history to review the trip details and fare breakdown.\n2. If the charge doesn't match what was displayed, contact our support team.\n3. Provide the trip ID and details about the discrepancy.\n\nOur team will review your case and issue a refund if a billing error occurred. We aim to resolve billing issues as quickly as possible.",
    keywords: ["charged", "incorrect", "wrong", "overcharged", "fare", "billing", "price", "cost", "refund", "money"],
  },
  {
    id: "ps-2", categoryId: "problems", title: "I lost an item in the car",
    summary: "Recovering lost items from a trip",
    content: "If you left something in your driver's vehicle:\n\n1. Check your recent trip history to identify the trip.\n2. Contact our support team with the trip details and a description of the lost item.\n3. We'll attempt to connect you with the driver to arrange item return.\n\nPlease reach out as soon as possible \u2014 the sooner you report a lost item, the better the chances of recovery.",
    keywords: ["lost", "item", "forgot", "left", "car", "vehicle", "belongings", "found", "phone", "bag"],
  },
  {
    id: "ps-3", categoryId: "problems", title: "My app is not working",
    summary: "Troubleshooting app issues",
    content: "If the ZIBA app isn't working properly, try these steps:\n\n1. Make sure you have a stable internet connection (Wi-Fi or mobile data).\n2. Close the app completely and reopen it.\n3. Clear your browser cache if using the web version.\n4. Make sure your browser or device is up to date.\n5. Try signing out and signing back in.\n\nIf the problem continues after trying these steps, please contact our support team with details about the issue.",
    keywords: ["app", "not working", "broken", "crash", "error", "bug", "problem", "issue", "freeze", "slow"],
  },
  {
    id: "ps-4", categoryId: "problems", title: "How do I contact support?",
    summary: "Reaching our customer support team",
    content: "You can reach ZIBA's support team in several ways:\n\n\u2022 Through the Help Center in the app (you're here now!).\n\u2022 Via the Support page accessible from the Rider menu.\n\u2022 By describing your issue in detail so our team can assist you quickly.\n\nOur support team aims to respond as quickly as possible. When contacting us, please include relevant trip details to help us resolve your issue faster.",
    keywords: ["contact", "support", "help", "reach", "team", "customer", "service", "chat", "email", "call"],
  },
];

const SYNONYM_MAP: Record<string, string[]> = {
  money: ["payment", "pay", "cash", "wallet", "charge", "fare", "cost", "price", "billing"],
  pay: ["payment", "cash", "wallet", "money", "charge", "fare"],
  ride: ["trip", "book", "request", "travel", "journey"],
  trip: ["ride", "book", "request", "travel", "journey"],
  book: ["request", "ride", "order", "schedule"],
  safe: ["safety", "security", "protect", "trust", "secure", "emergency", "sos"],
  cancel: ["cancelled", "canceled", "stop", "abort", "end"],
  problem: ["issue", "error", "bug", "broken", "not working", "help"],
  driver: ["rider", "car", "vehicle"],
  charge: ["charged", "fare", "price", "cost", "billing", "payment"],
  schedule: ["book", "advance", "plan", "reserve", "future", "later"],
  lost: ["forgot", "left", "missing", "item", "belongings"],
  login: ["log", "sign", "password", "account", "access"],
  wallet: ["balance", "funds", "money", "payment"],
};

function fuzzySearch(query: string, articles: HelpArticle[]): HelpArticle[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
  const expandedWords = new Set<string>(queryWords);

  for (let i = 0; i < queryWords.length; i++) {
    const word = queryWords[i];
    if (SYNONYM_MAP[word]) {
      SYNONYM_MAP[word].forEach(syn => expandedWords.add(syn));
    }
    const entries = Object.entries(SYNONYM_MAP);
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
  car: Car,
  wallet: Wallet,
  banknote: Banknote,
  clock: Clock,
  shield: Shield,
  user: User,
  wrench: Wrench,
};

type ViewState = "home" | "category" | "article" | "search";

export default function HelpCenterPage({
  audience = "ALL",
}: {
  audience?: string;
}) {
  const [view, setView] = useState<ViewState>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const categoryArticles = useMemo(() => {
    if (!selectedCategory) return [];
    return ARTICLES.filter(a => a.categoryId === selectedCategory.id);
  }, [selectedCategory]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return fuzzySearch(searchQuery, ARTICLES);
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 1;

  const featuredArticles = useMemo(() => {
    return [
      ARTICLES.find(a => a.id === "gs-2")!,
      ARTICLES.find(a => a.id === "pw-1")!,
      ARTICLES.find(a => a.id === "cs-1")!,
      ARTICLES.find(a => a.id === "sf-1")!,
    ];
  }, []);

  const handleCategoryClick = (category: HelpCategory) => {
    setSelectedCategory(category);
    setView("category");
  };

  const handleArticleClick = (article: HelpArticle) => {
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

  const getCategoryForArticle = (article: HelpArticle) => {
    return CATEGORIES.find(c => c.id === article.categoryId);
  };

  if (view === "article" && selectedArticle) {
    const articleCategory = getCategoryForArticle(selectedArticle);
    return (
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
              Still need help? Visit the{" "}
              <button
                className="text-primary underline"
                onClick={() => { setView("home"); setSelectedArticle(null); setSelectedCategory(null); setSearchQuery(""); }}
                data-testid="link-back-to-help"
              >
                Help Center
              </button>{" "}
              or contact our support team.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "category" && selectedCategory) {
    const Icon = CATEGORY_ICONS[selectedCategory.icon] || HelpCircle;
    return (
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
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <HelpCircle className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold" data-testid="text-help-center-title">
          Help Center
        </h1>
        <p className="text-muted-foreground" data-testid="text-help-center-subtitle">
          Find answers to your questions
        </p>
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
          {searchResults.length > 0 && searchQuery.trim().length > 0 && (
            <p className="text-sm text-muted-foreground" data-testid="text-search-hint">
              {ARTICLES.some(a =>
                a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.summary.toLowerCase().includes(searchQuery.toLowerCase())
              )
                ? `${searchResults.length} result${searchResults.length === 1 ? "" : "s"} found`
                : "Here's something that might help."}
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
          <div className="space-y-3">
            <h2 className="text-lg font-semibold" data-testid="text-categories-title">
              Categories
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

          <div className="space-y-3">
            <h2 className="text-lg font-semibold" data-testid="text-popular-title">
              Popular Articles
            </h2>
            {featuredArticles.map((article) => {
              const cat = getCategoryForArticle(article);
              return (
                <Card
                  key={article.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => {
                    setSelectedCategory(null);
                    handleArticleClick(article);
                  }}
                  data-testid={`card-featured-${article.id}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium" data-testid={`text-featured-title-${article.id}`}>
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
        </>
      )}
    </div>
  );
}
