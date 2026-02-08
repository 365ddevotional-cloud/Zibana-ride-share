export type ZibraRole = "rider" | "driver" | "admin" | "super_admin" | "director" | "general";

export type ZibraCategory =
  | "account" | "saved_places" | "wallet" | "cash_wallet" | "scheduling"
  | "cancellation" | "cancellation_fees" | "driver_delay" | "lost_item"
  | "safety" | "inbox" | "app_settings" | "booking" | "payment"
  | "driver_signup" | "driver_training" | "driver_approval" | "going_online"
  | "trip_acceptance" | "rider_cancellation" | "accident" | "driver_wallet"
  | "troubleshooting" | "approval_management" | "trust_score" | "lost_item_dispute"
  | "accident_ticket" | "reports" | "admin_notifications" | "user_complaints"
  | "system_config" | "feature_flags" | "audit" | "abuse_patterns"
  | "risky_actions" | "compliance" | "escalation" | "identity"
  | "emotional" | "legal_threat" | "fraud_attempt" | "system_failure"
  | "role_confusion" | "general_help"
  | "director_cell" | "director_commission" | "director_drivers"
  | "director_performance" | "director_recruiting"
  | "director_lifecycle" | "director_appeals" | "director_deescalation"
  | "director_coaching" | "director_termination" | "director_succession"
  | "driver_coaching"
  | "rider_coaching";

export interface ZibraTemplate {
  id: string;
  role: ZibraRole | ZibraRole[];
  category: ZibraCategory;
  keywords: string[];
  response: string;
  priority?: number;
}

export const ZIBRA_TEMPLATES: ZibraTemplate[] = [

  // ============================
  // RIDER TEMPLATES (~60)
  // ============================

  // Account & Signup
  {
    id: "r-account-create",
    role: "rider",
    category: "account",
    keywords: ["sign up", "signup", "create account", "register", "new account", "join"],
    response: "To create an account:\n1. Open the ZIBA app.\n2. Log in using your Replit account.\n3. Your rider profile will be created automatically.\n\nLet me know if you'd like help with the next step."
  },
  {
    id: "r-account-edit",
    role: "rider",
    category: "account",
    keywords: ["edit profile", "update profile", "change name", "change phone", "profile settings"],
    response: "To update your profile:\n1. Go to the Account tab.\n2. Tap your profile section.\n3. Edit your name, phone, or other details.\n\nChanges are saved automatically. I can guide you through this if you want."
  },
  {
    id: "r-account-delete",
    role: "rider",
    category: "account",
    keywords: ["delete account", "remove account", "close account", "deactivate"],
    response: "To request account changes, please submit a support ticket through the Help Center. A support agent will look into this and guide you through the process."
  },
  {
    id: "r-account-login",
    role: "rider",
    category: "account",
    keywords: ["login", "log in", "can't login", "login issue", "sign in", "signin"],
    response: "ZIBA uses your Replit account for sign-in. If you're having trouble logging in:\n1. Make sure you're using the correct Replit account.\n2. Try refreshing the page.\n3. Clear your browser cache if needed.\n\nIf the issue persists, submit a support ticket for assistance."
  },
  {
    id: "r-account-notifications",
    role: "rider",
    category: "account",
    keywords: ["notification settings", "notification preferences", "turn off notifications", "mute"],
    response: "To manage your notification preferences:\n1. Go to the Account tab.\n2. Open Communication settings.\n3. Toggle notifications on or off as needed.\n\nI can guide you through this if you want."
  },
  {
    id: "r-account-privacy",
    role: "rider",
    category: "account",
    keywords: ["privacy", "privacy settings", "data", "personal information", "personal data"],
    response: "Your privacy settings are available in the Account tab under Privacy. You can review what information is shared and adjust your preferences. For specific data requests, submit a support ticket."
  },
  {
    id: "r-account-appearance",
    role: "rider",
    category: "app_settings",
    keywords: ["dark mode", "light mode", "theme", "appearance", "display"],
    response: "To change the app appearance:\n1. Go to the Account tab.\n2. Open Appearance settings.\n3. Choose Light, Dark, or System theme.\n\nThe change takes effect immediately."
  },

  // Saved Places
  {
    id: "r-saved-home",
    role: "rider",
    category: "saved_places",
    keywords: ["save home", "home address", "set home", "add home"],
    response: "To save your Home address:\n1. Go to the Account tab.\n2. Open Saved Places.\n3. Tap 'Home' and enter your address.\n\nYour saved Home address will appear as a quick option when booking rides. Let me know if you'd like help with the next step."
  },
  {
    id: "r-saved-work",
    role: "rider",
    category: "saved_places",
    keywords: ["save work", "work address", "set work", "add work", "office"],
    response: "To save your Work address:\n1. Go to the Account tab.\n2. Open Saved Places.\n3. Tap 'Work' and enter your address.\n\nYour saved Work address will appear as a quick option when booking rides. Let me know if you'd like help with the next step."
  },
  {
    id: "r-saved-edit",
    role: "rider",
    category: "saved_places",
    keywords: ["change home", "change work", "edit saved", "update address", "wrong address"],
    response: "To update a saved address:\n1. Go to the Account tab.\n2. Open Saved Places.\n3. Tap the address you want to change and enter the new one.\n\nI can guide you through this if you want."
  },

  // Wallet & Top-Up
  {
    id: "r-wallet-balance",
    role: "rider",
    category: "wallet",
    keywords: ["wallet balance", "check balance", "how much", "balance", "my wallet"],
    response: "To check your wallet balance:\n1. Open the Wallet section from the navigation.\n2. Your current balance is displayed at the top.\n\nYou can also view recent transactions in the same section."
  },
  {
    id: "r-wallet-topup",
    role: "rider",
    category: "wallet",
    keywords: ["top up", "topup", "add money", "fund wallet", "add funds", "load wallet"],
    response: "To add funds to your wallet:\n1. Go to the Wallet section.\n2. Tap 'Top Up' or 'Add Funds'.\n3. Enter the amount and confirm.\n\nFunds are typically added shortly after confirmation. Let me know if you'd like help with the next step."
  },
  {
    id: "r-wallet-auto-topup",
    role: "rider",
    category: "wallet",
    keywords: ["auto top up", "auto topup", "automatic", "auto fund", "auto reload"],
    response: "You can set up automatic wallet top-ups:\n1. Go to the Wallet section.\n2. Look for Auto Top-Up settings.\n3. Set your minimum balance threshold and top-up amount.\n\nWhen your balance drops below the threshold, your wallet will be funded automatically."
  },
  {
    id: "r-wallet-history",
    role: "rider",
    category: "wallet",
    keywords: ["transaction history", "wallet history", "past transactions", "transaction log"],
    response: "To view your transaction history:\n1. Go to the Wallet section.\n2. Scroll down to see recent transactions.\n\nEach entry shows the amount, type, and date. Let me know if you need further guidance."
  },

  // Cash vs Wallet Usage
  {
    id: "r-cash-pay",
    role: "rider",
    category: "cash_wallet",
    keywords: ["pay cash", "cash payment", "pay with cash", "cash ride"],
    response: "You can pay with cash on eligible trips. When booking:\n1. Select 'Cash' as your payment method before confirming.\n2. Pay the driver directly at the end of the trip.\n\nPlease note that cash availability may vary by location."
  },
  {
    id: "r-cash-vs-wallet",
    role: "rider",
    category: "cash_wallet",
    keywords: ["cash or wallet", "which payment", "payment method", "how to pay", "payment options"],
    response: "ZIBA supports three payment methods:\n- Wallet: Pre-funded balance for quick payment.\n- Cash: Pay the driver directly after the trip.\n- Card: Pay with a linked card.\n\nYou can select your preferred method when booking a ride."
  },
  {
    id: "r-cash-change",
    role: "rider",
    category: "cash_wallet",
    keywords: ["change payment", "switch payment", "different payment"],
    response: "To change your payment method:\n1. Start booking a ride.\n2. Tap the payment method option before confirming.\n3. Select your preferred method (Wallet, Cash, or Card).\n\nI can guide you through this if you want."
  },

  // Scheduling Rides
  {
    id: "r-schedule-ride",
    role: "rider",
    category: "scheduling",
    keywords: ["schedule", "schedule ride", "advance booking", "book later", "future ride", "pre-book"],
    response: "To schedule a ride in advance:\n1. Go to Services.\n2. Select 'Scheduled Rides'.\n3. Set your pickup time (up to 7 days ahead).\n4. Enter your pickup and drop-off locations.\n\nZIBA will help match you with an available driver at the scheduled time. Let me know if you'd like help with the next step."
  },
  {
    id: "r-schedule-cancel",
    role: "rider",
    category: "scheduling",
    keywords: ["cancel scheduled", "cancel reservation", "cancel future ride", "remove scheduled"],
    response: "To cancel a scheduled ride:\n1. Go to Activity.\n2. Find the scheduled ride.\n3. Tap 'Cancel' and confirm.\n\nCancellation fees may apply depending on how close to the scheduled time you cancel. You may choose to review the cancellation policy in the Legal section."
  },
  {
    id: "r-schedule-edit",
    role: "rider",
    category: "scheduling",
    keywords: ["change schedule", "reschedule", "modify scheduled", "edit reservation"],
    response: "To modify a scheduled ride, you may need to cancel the existing one and create a new booking with the updated details. Go to Activity to find your scheduled ride. Let me know if you need further guidance."
  },

  // Canceling Rides
  {
    id: "r-cancel-ride",
    role: "rider",
    category: "cancellation",
    keywords: ["cancel ride", "cancel trip", "cancel my ride", "cancel booking"],
    response: "To cancel an active ride:\n1. Open the active trip screen.\n2. Tap the 'Cancel' option.\n3. Confirm the cancellation.\n\nCancellation fees may apply depending on timing. You may choose to review the cancellation policy in the Legal section."
  },
  {
    id: "r-cancel-free",
    role: "rider",
    category: "cancellation",
    keywords: ["free cancel", "no fee cancel", "cancel without charge", "grace period"],
    response: "A grace period may apply after booking during which you can cancel without a fee. The exact timing depends on your location and trip type. You may choose to review the cancellation policy in the Legal section for details."
  },

  // Cancellation Fees
  {
    id: "r-cancel-fee-why",
    role: "rider",
    category: "cancellation_fees",
    keywords: ["why charged", "cancellation fee", "cancel charge", "fee for canceling", "unfair charge", "charged for cancel"],
    response: "Cancellation fees may be applied when a ride is canceled after the grace period. The fee helps cover the driver's time and effort in traveling to your location. Your charges are shown in your trip summary. For a detailed review, we recommend submitting a support ticket."
  },
  {
    id: "r-cancel-fee-refund",
    role: "rider",
    category: "cancellation_fees",
    keywords: ["refund cancel fee", "get back cancel fee", "dispute cancel", "reverse charge"],
    response: "If you believe a cancellation fee was applied in error, you can request a review:\n1. Go to the Help Center.\n2. Submit a support ticket with details about the trip.\n\nA support agent will look into this. We cannot guarantee a specific outcome, but every case is reviewed individually."
  },

  // Driver Delays / No-Show
  {
    id: "r-driver-late",
    role: "rider",
    category: "driver_delay",
    keywords: ["driver late", "driver not coming", "waiting too long", "delayed", "taking long"],
    response: "If your driver is delayed, you can:\n1. Check the trip screen for the driver's estimated arrival.\n2. Contact the driver through the in-app messaging.\n3. Cancel and request a new ride if needed.\n\nIf the wait is excessive, you may be eligible to cancel without a fee. Let me know if you need further guidance."
  },
  {
    id: "r-driver-noshow",
    role: "rider",
    category: "driver_delay",
    keywords: ["driver no show", "driver didn't come", "driver never arrived", "no driver"],
    response: "If your driver did not arrive:\n1. Cancel the ride from the trip screen.\n2. Report the no-show through the Help Center.\n3. Request a new ride.\n\nWe recommend submitting a support ticket so the situation can be reviewed. Let me know if you'd like help with the next step."
  },

  // Lost Items (Rider)
  {
    id: "r-lost-report",
    role: "rider",
    category: "lost_item",
    keywords: ["lost item", "left something", "forgot item", "lost phone", "lost bag", "lost in car"],
    response: "ZIBA can help connect you with the driver to coordinate next steps.\n1. Go to Activity and find the trip.\n2. Tap 'Report Lost Item' and provide details.\n\nDrivers are not required to return items, but many choose to. You may also arrange pickup at a Safe Return Hub if available. Let me know if you need further guidance."
  },
  {
    id: "r-lost-status",
    role: "rider",
    category: "lost_item",
    keywords: ["lost item status", "item found", "item update", "check lost item", "any update"],
    response: "To check the status of a reported lost item:\n1. Go to Activity.\n2. Find the relevant trip.\n3. Check the lost item report status.\n\nYou will also receive notifications when the driver responds. Let me know if you need further guidance."
  },
  {
    id: "r-lost-hub",
    role: "rider",
    category: "lost_item",
    keywords: ["safe return hub", "pickup hub", "where to pick up", "hub location", "collection point"],
    response: "Safe Return Hubs are designated locations where drivers can securely drop off found items for you to pick up. If a driver drops your item at a hub, you'll be notified with the hub details including location and operating hours. A service fee may apply."
  },
  {
    id: "r-lost-fee",
    role: "rider",
    category: "lost_item",
    keywords: ["return fee", "lost item fee", "charge for return", "cost to get item"],
    response: "A return fee may apply when a driver returns a lost item, either directly or through a Safe Return Hub. The fee amount varies by location. Details are shown in the lost item report. Let me know if you need further guidance."
  },
  {
    id: "r-lost-not-found",
    role: "rider",
    category: "lost_item",
    keywords: ["driver denied", "item not found", "driver says no", "can't find item"],
    response: "If the driver indicates they did not find the item, you can:\n1. Submit additional details through the lost item report.\n2. Submit a support ticket for further review.\n\nZIBA facilitates communication between riders and drivers but cannot guarantee item recovery. Let me know if you'd like to submit a ticket."
  },

  // Safety Concerns (Rider)
  {
    id: "r-safety-sos",
    role: "rider",
    category: "safety",
    keywords: ["sos", "emergency", "help me", "danger", "unsafe", "911", "police"],
    response: "If there's an emergency, please contact local emergency services first. During an active trip, you can use the SOS button for immediate assistance. ZIBA facilitates safety tools to assist you. Let me know if you'd like help with the next step.",
    priority: 10
  },
  {
    id: "r-safety-incident",
    role: "rider",
    category: "safety",
    keywords: ["report incident", "incident", "bad experience", "harass", "uncomfortable", "threatened"],
    response: "If there's an emergency, please contact local emergency services first. To report an incident:\n1. Go to the Safety Hub.\n2. Select 'Report Incident'.\n3. Provide details about what happened.\n\nYour report will be reviewed by our team. ZIBA facilitates incident documentation and review processes.",
    priority: 10
  },
  {
    id: "r-safety-share-trip",
    role: "rider",
    category: "safety",
    keywords: ["share trip", "share location", "trip sharing", "trusted contact", "share ride"],
    response: "You can share your trip with trusted contacts for added safety:\n1. During an active trip, look for the 'Share Trip' option.\n2. Select a contact to share your live trip details with.\n\nTrusted contacts can be managed in the Safety section of your Account. Let me know if you'd like help setting this up."
  },
  {
    id: "r-safety-driver-behavior",
    role: "rider",
    category: "safety",
    keywords: ["bad driver", "reckless", "speeding", "rude driver", "unprofessional"],
    response: "We're sorry to hear about this experience. To report driver behavior:\n1. Go to Activity and find the trip.\n2. Rate the trip and leave detailed feedback.\n3. For serious concerns, submit a report through the Safety Hub.\n\nZIBA facilitates review of reported behavior. Let me know if you'd like help with the next step."
  },

  // Inbox & Notifications (Rider)
  {
    id: "r-inbox-view",
    role: "rider",
    category: "inbox",
    keywords: ["inbox", "messages", "notifications", "unread", "new message"],
    response: "Your messages are available in the Inbox tab. This includes trip updates, system announcements, and promotional messages. Unread messages are marked with an indicator. Let me know if you need further guidance."
  },
  {
    id: "r-inbox-clear",
    role: "rider",
    category: "inbox",
    keywords: ["clear inbox", "mark read", "read all", "dismiss notifications"],
    response: "To manage your inbox:\n1. Open the Inbox tab.\n2. Tap individual messages to mark them as read.\n3. Use 'Mark All Read' if available to clear unread indicators.\n\nLet me know if you need further guidance."
  },

  // Booking
  {
    id: "r-book-ride",
    role: "rider",
    category: "booking",
    keywords: ["book", "ride", "request ride", "get ride", "order ride", "need ride", "find driver"],
    response: "To book a ride:\n1. Go to the Home tab.\n2. Enter your pickup and drop-off locations.\n3. Choose your preferred ride type and confirm.\n\nZIBA helps connect you with available drivers in your area. Let me know if you'd like help with the next step."
  },
  {
    id: "r-book-fare",
    role: "rider",
    category: "booking",
    keywords: ["fare", "price", "cost", "how much", "estimate", "trip cost"],
    response: "The estimated fare is shown before you confirm a ride. It is calculated based on distance, duration, and applicable rates for your area. Final charges may vary slightly from the estimate. Your charges are shown in your trip summary."
  },
  {
    id: "r-book-no-drivers",
    role: "rider",
    category: "booking",
    keywords: ["no drivers", "no driver available", "can't find driver", "no one available"],
    response: "If no drivers are available:\n1. Wait a few minutes and try again.\n2. Try adjusting your pickup location slightly.\n3. Consider scheduling a ride for a later time.\n\nDriver availability varies by time and location. Let me know if you'd like help with the next step."
  },

  // Payment
  {
    id: "r-payment-charged",
    role: "rider",
    category: "payment",
    keywords: ["charged unfairly", "wrong charge", "overcharged", "extra charge", "double charge"],
    response: "Your charges are shown in your trip summary. If you believe a charge is incorrect:\n1. Go to Activity and find the trip.\n2. Review the trip details and fare breakdown.\n3. Submit a support ticket if you need a review.\n\nA support agent will look into this. We cannot guarantee a specific outcome, but every case is reviewed individually."
  },
  {
    id: "r-payment-refund",
    role: "rider",
    category: "payment",
    keywords: ["refund", "get money back", "return money", "want refund"],
    response: "To request a review of charges:\n1. Go to the Help Center.\n2. Submit a support ticket with details about the trip.\n\nA support agent will look into this. Refund decisions are made on a case-by-case basis after review."
  },

  // App Settings (Rider)
  {
    id: "r-app-language",
    role: "rider",
    category: "app_settings",
    keywords: ["language", "change language", "app language", "english", "other language"],
    response: "Language preferences can be managed in your Account settings. ZIBA currently supports English. Additional language support is being expanded. If your preferred language is not available, the app will default to English."
  },

  // Ride Experience (Rider)
  {
    id: "r-ride-rating",
    role: "rider",
    category: "booking",
    keywords: ["rate ride", "rate driver", "rating", "stars", "review trip", "give rating"],
    response: "To rate a completed ride:\n1. After your trip ends, the rating prompt will appear.\n2. Select a star rating and optionally leave a comment.\n3. Submit your rating.\n\nYour feedback helps maintain service quality. Let me know if you need further guidance."
  },
  {
    id: "r-ride-receipt",
    role: "rider",
    category: "booking",
    keywords: ["receipt", "trip receipt", "ride receipt", "invoice", "fare breakdown", "email receipt"],
    response: "To view your trip receipt:\n1. Go to Activity and find the completed trip.\n2. Tap the trip to see the fare breakdown and receipt details.\n\nReceipts include pickup, drop-off, distance, duration, and total charges. I can guide you through this if you want."
  },
  {
    id: "r-ride-route",
    role: "rider",
    category: "booking",
    keywords: ["wrong route", "bad route", "longer route", "detour", "different route", "not shortest"],
    response: "If your driver took a different route than expected, the fare may reflect the actual distance traveled. To request a review:\n1. Go to Activity and find the trip.\n2. Review the route details.\n3. Submit a support ticket if you believe the route was incorrect.\n\nWe recommend providing specific details for a thorough review. Let me know if you need further guidance."
  },
  {
    id: "r-ride-corporate",
    role: "rider",
    category: "booking",
    keywords: ["corporate ride", "business ride", "company ride", "corporate account", "business account", "how corporate works", "corporate policy", "business travel", "corporate setup", "join corporate", "company code", "corporate access"],
    response: "Corporate Rides let you travel on your company's account — they handle billing, you just ride. To get started, you can either enter a company code provided by your admin, or request access by sharing your company's name. Your company admin will review and approve your request. I can't promise approval or timelines, but I'm here to help you through the process. Visit the Corporate Rides page under Services to begin."
  },
  {
    id: "r-ride-special",
    role: "rider",
    category: "booking",
    keywords: ["special ride", "group ride", "event ride", "premium ride", "long distance", "charter", "special rides available", "group trip", "event transport", "luxury ride"],
    response: "Special Rides are unique ride types beyond your everyday commute. You can explore Group Rides for traveling with friends or family, Event Transportation for coordinating rides for gatherings, and more options on the way. Each type has its own availability and eligibility — tap on any ride type to learn the details. I can't guarantee access or approval, but I can help explain what's available. Visit the Special Rides page under Services to explore."
  },
  {
    id: "a-corporate-config",
    role: "admin",
    category: "operations",
    keywords: ["corporate rides admin", "setup corporate", "create corporate account", "corporate billing", "corporate management", "manage corporate", "corporate configuration"],
    response: "As an Admin, you can manage Corporate Rides from the admin dashboard. You can create corporate accounts with company details, set billing types (invoice, prepaid wallet, or hybrid), assign riders to corporate accounts, and suspend or terminate accounts. Navigate to the Corporate Rides tab in your dashboard to get started."
  },
  {
    id: "a-special-rides-config",
    role: "admin",
    category: "operations",
    keywords: ["special rides admin", "configure special", "enable group rides", "enable event rides", "special rides settings", "manage special rides", "premium rides setup"],
    response: "As an Admin, you can configure Special Rides from the admin dashboard. Enable or disable ride types (Group, Event, Premium, Long-Distance), set driver eligibility criteria like minimum trust scores and vehicle requirements, and manage country availability. The Special Rides tab in your dashboard gives you full control."
  },
  {
    id: "d-corporate-management",
    role: "director",
    category: "operations",
    keywords: ["corporate drivers", "corporate ride management", "corporate activity", "driver corporate eligibility", "flag corporate driver", "recommend corporate driver"],
    response: "As a Director, you can monitor corporate ride drivers in your cell from the Corporate tab on your dashboard. You can view activity counts (not revenue), flag driver issues for admin review, and recommend drivers for corporate eligibility. Account creation and billing rules are managed by Admin."
  },
  {
    id: "d-special-rides-management",
    role: "director",
    category: "operations",
    keywords: ["special rides director", "driver special eligibility", "recommend special driver", "suspend special driver", "special ride demand", "group ride drivers", "event ride drivers"],
    response: "As a Director, you can manage your cell's drivers for special rides from the Special Rides tab on your dashboard. You can view eligible drivers, recommend drivers for admin approval, temporarily suspend drivers from special rides, and see ride demand indicators. Final approval of eligibility is always handled by Admin."
  },
  {
    id: "d-driver-corporate-why",
    role: "director",
    category: "operations",
    keywords: ["why can't driver do corporate", "driver not eligible corporate", "corporate eligibility", "driver blocked corporate"],
    response: "If a driver in your cell isn't eligible for corporate rides, here's what to check: 1) Has the driver been assigned to a corporate account by Admin? 2) Is the driver's status active and not suspended? 3) Does the driver meet the minimum trust score requirement? You can recommend the driver for corporate eligibility from your dashboard, and Admin will review and approve."
  },
  {
    id: "r-fund-user",
    role: "rider",
    category: "payments",
    keywords: ["fund another user", "send money", "send funds", "wallet transfer", "fund friend", "fund family", "fund child", "fund spouse", "fund colleague", "peer to peer", "transfer wallet"],
    response: "ZIBA allows you to support others by funding their wallets. You can send funds to a family member, friend, spouse, or colleague who is a registered ZIBA user. Once funds are transferred, they are not reversible. ZIBA facilitates wallet transfers but does not mediate personal disputes. You can start from the Payments page under 'Fund Another User'."
  },
  {
    id: "r-fund-refund",
    role: "rider",
    category: "payments",
    keywords: ["refund wallet transfer", "reverse transfer", "undo send", "get money back", "funding refund", "cancel transfer"],
    response: "Once a wallet transfer is completed, it cannot be reversed. ZIBA facilitates transfers between users but is not responsible for agreements between individuals. Please verify the recipient carefully before confirming any transfer. If you believe there is an error, you can contact support, but refunds on voluntary transfers are not guaranteed."
  },
  {
    id: "d-fund-driver",
    role: "director",
    category: "payments",
    keywords: ["fund driver", "send money driver", "driver wallet funding", "driver financial support", "fund my drivers", "driver fund limit"],
    response: "As a Director, you can fund wallets of drivers assigned to your cell. Funding is subject to daily caps set by Admin. You can optionally restrict funds to ride usage only. All funding transactions are logged, audited, and visible to Admin and Super Admin. Unusual patterns may be flagged by ZIBRA for review."
  },

  // Safety (Rider) - Additional
  {
    id: "r-safety-trusted-contacts",
    role: "rider",
    category: "safety",
    keywords: ["trusted contacts", "manage contacts", "add contact", "emergency contact", "safety contact"],
    response: "To manage your trusted contacts:\n1. Go to the Safety Hub in your Account.\n2. Select 'Trusted Contacts'.\n3. Add, edit, or remove contacts as needed.\n\nTrusted contacts can receive your live trip details when you share a trip. We recommend keeping this list up to date. Let me know if you need further guidance."
  },
  {
    id: "r-safety-accident",
    role: "rider",
    category: "safety",
    keywords: ["accident", "crash", "collision", "injured", "rider accident", "hurt"],
    response: "If there's an emergency, please contact local emergency services first. To report an accident as a rider:\n1. Go to the Safety Hub.\n2. Select 'Report Incident' and choose 'Accident'.\n3. Provide details and any photos if available.\n\nZIBA facilitates documentation and review of accident reports. Let me know if you need immediate assistance.",
    priority: 10
  },

  // Wallet (Rider) - Additional
  {
    id: "r-wallet-failed-topup",
    role: "rider",
    category: "wallet",
    keywords: ["top up failed", "topup failed", "payment failed", "can't add money", "fund failed", "declined"],
    response: "If your wallet top-up failed:\n1. Check that your payment method is valid and has sufficient funds.\n2. Verify that your card details are entered correctly.\n3. Try again after a few minutes.\n\nIf the issue persists, submit a support ticket for assistance. Let me know if you need further guidance."
  },

  // Cash (Rider) - Additional

  // Referral & Promo (Rider)
  {
    id: "r-referral",
    role: "rider",
    category: "account",
    keywords: ["referral", "refer friend", "referral code", "invite friend", "referral program", "share code"],
    response: "ZIBA helps facilitate referral rewards when you invite friends to the platform. To find your referral code:\n1. Go to the Account section.\n2. Look for the Referral or Invite Friends option.\n3. Share your unique code with friends.\n\nRewards are applied when your referral completes qualifying activity. Let me know if you need further guidance."
  },
  {
    id: "r-promo",
    role: "rider",
    category: "payment",
    keywords: ["promo code", "promotion", "discount", "coupon", "promo", "discount code"],
    response: "To apply a promo code:\n1. Enter your promo code in the Promotions section or during booking.\n2. The discount will be applied to eligible trips.\n\nPromo codes have specific terms and expiration dates. Based on your situation, check the promo details for eligibility requirements. Let me know if you need further guidance."
  },

  // App Issues (Rider)

  // Corporate & Feedback (Rider)
  {
    id: "r-feedback",
    role: "rider",
    category: "general_help",
    keywords: ["feedback", "suggestion", "improve", "feature request", "idea"],
    response: "We appreciate your feedback. To share suggestions or ideas:\n1. Go to the Help Center.\n2. Submit a support ticket with your feedback.\n\nYour input helps us improve the ZIBA experience. Let me know if you need further guidance."
  },
  {
    id: "r-help-center",
    role: "rider",
    category: "general_help",
    keywords: ["help center", "where is help", "find help", "support page", "help section"],
    response: "The Help Center is accessible from your Account tab or the Support section. It contains frequently asked questions, guides, and the option to submit a support ticket. Based on your situation, you can browse topics or search for specific help. I can guide you through this if you want."
  },

  // ============================
  // RIDER COACHING: Trust, Loyalty & Wallet Growth
  // ============================

  {
    id: "r-trust-score-explained",
    role: "rider",
    category: "rider_coaching",
    keywords: ["trust score", "my score", "how is score calculated", "what is trust", "rider score"],
    response: "Your trust score reflects your overall reliability on the platform. It considers your ride completion history, payment patterns, and general conduct. Higher scores can lead to better ride matching and additional benefits. You can maintain a strong score by completing rides, paying on time, and being respectful."
  },
  {
    id: "r-trust-tier",
    role: "rider",
    category: "rider_coaching",
    keywords: ["trust tier", "platinum", "gold", "standard", "limited", "my tier", "tier benefits"],
    response: "Trust tiers reflect your overall platform experience. Tiers range from Platinum (highest) to Limited. Higher tiers may offer benefits like longer cancellation grace periods and improved ride matching. Maintain good habits \u2014 complete rides, pay promptly, and treat drivers well \u2014 to keep or improve your tier."
  },
  {
    id: "r-wallet-usage-tips",
    role: "rider",
    category: "rider_coaching",
    keywords: ["wallet tips", "use wallet", "wallet benefits", "should I use wallet", "wallet vs cash"],
    response: "Using your ZIBA wallet for rides can offer a smoother experience with faster payments and no need for exact change. Wallet-funded rides are processed instantly and may contribute positively to your platform experience. You can top up your wallet anytime through the app."
  },
  {
    id: "r-cancellation-guidance",
    role: "rider",
    category: "rider_coaching",
    keywords: ["cancellation", "cancel ride", "cancel fee", "why was I charged", "cancellation penalty"],
    response: "You can cancel a ride within the grace window without fees. The grace window length depends on your trust tier. Frequent cancellations may affect your trust score. If a cancellation fee was applied, it was because the cancellation occurred after the grace period or the driver had already arrived at the pickup point."
  },
  {
    id: "r-improve-trust",
    role: "rider",
    category: "rider_coaching",
    keywords: ["improve score", "raise score", "increase trust", "how to improve", "better score"],
    response: "To improve your trust score: complete rides you request, arrive at pickup points on time, pay promptly using your wallet or confirmed payment method, treat drivers with respect, and keep your profile information up to date. Consistent positive behavior is the best path to a higher score."
  },
  {
    id: "r-loyalty-incentives",
    role: "rider",
    category: "rider_coaching",
    keywords: ["loyalty", "rewards", "incentive", "perks", "benefits", "ride credits"],
    response: "ZIBA may occasionally offer loyalty incentives such as ride credits or reduced fees based on your platform activity. These are not guaranteed and are managed by the platform. Continue using ZIBA regularly and maintaining good standing to be eligible for available incentives."
  },
  {
    id: "r-wallet-funding-others",
    role: "rider",
    category: "rider_coaching",
    keywords: ["someone fund my wallet", "parent fund", "employer fund", "friend fund", "receive funds"],
    response: "Other people can send funds to your ZIBA wallet \u2014 such as family members, employers, or friends. You will need to accept incoming funds before they are added to your wallet. There are no repayment obligations for received funds. Caps may apply to prevent misuse."
  },
  {
    id: "r-score-decreased",
    role: "rider",
    category: "rider_coaching",
    keywords: ["score went down", "score dropped", "why did score decrease", "lower score", "lost points"],
    response: "Your trust score may adjust based on recent activity. Common reasons include ride cancellations, payment issues, or incident reports. This is not a penalty \u2014 it reflects platform interaction patterns. You can improve your score over time through consistent, positive behavior."
  },

  // ============================
  // DRIVER TEMPLATES (~40)
  // ============================

  // Driver Signup & Approval
  {
    id: "d-signup",
    role: "driver",
    category: "driver_signup",
    keywords: ["sign up", "register", "become driver", "join as driver", "apply", "driver application"],
    response: "To apply as a driver:\n1. Log in with your Replit account.\n2. Select the driver role during registration.\n3. Submit your identity documents, vehicle information, and required licenses.\n\nYour application will be reviewed by our team. Let me know if you'd like help with the next step."
  },
  {
    id: "d-signup-documents",
    role: "driver",
    category: "driver_signup",
    keywords: ["documents", "what documents", "required docs", "upload documents", "verification docs"],
    response: "Required documents vary by country but typically include:\n- Valid government-issued ID\n- Driver's license\n- Vehicle registration\n- Vehicle insurance\n- Profile photo\n\nUpload these in the registration flow. Identity verification requirements depend on your country's regulations."
  },
  {
    id: "d-signup-status",
    role: "driver",
    category: "driver_signup",
    keywords: ["application status", "registration status", "check status", "approved yet", "how long"],
    response: "To check your application status:\n1. Go to your Driver Home.\n2. Your approval status is displayed on the main screen.\n\nReview times vary. You will receive a notification when a decision is made. Let me know if you need further guidance."
  },

  // Training vs Active Driver
  {
    id: "d-training-required",
    role: "driver",
    category: "driver_training",
    keywords: ["training required", "must complete training", "training modules", "mandatory training"],
    response: "Training modules help you understand ZIBA's features and policies. Access them from the Help tab:\n- Lost Item Protocol\n- Safe Return Hubs\n- Accident Reporting\n- Trust Score & Safety\n\nCompleting training helps you provide better service and understand platform procedures. Let me know if you'd like help with the next step."
  },

  // Pending Approval
  {
    id: "d-pending",
    role: "driver",
    category: "driver_approval",
    keywords: ["pending", "waiting approval", "not approved", "still pending", "when approved"],
    response: "Your application is under review. Review times vary based on volume. You will receive a notification when a decision is made. While waiting:\n1. Ensure all documents are uploaded correctly.\n2. Complete any available training modules.\n\nLet me know if you need further guidance."
  },
  {
    id: "d-rejected",
    role: "driver",
    category: "driver_approval",
    keywords: ["rejected", "denied", "not approved", "application rejected", "why rejected"],
    response: "If your application was not approved, you should have received a notification with the reason. Common reasons include incomplete documents or eligibility requirements. You may reapply after addressing the noted issues. For questions, submit a support ticket."
  },

  // Going Online/Offline
  {
    id: "d-go-online",
    role: "driver",
    category: "going_online",
    keywords: ["go online", "start driving", "accept rides", "get started", "online", "begin"],
    response: "To start accepting rides:\n1. Go to your Driver Home.\n2. Toggle the 'Go Online' switch.\n3. Make sure your GPS is enabled and you have an active internet connection.\n\nZIBA connects you with riders based on proximity and availability. Let me know if you'd like help with the next step."
  },
  {
    id: "d-go-offline",
    role: "driver",
    category: "going_online",
    keywords: ["go offline", "stop driving", "end shift", "offline", "stop accepting"],
    response: "To stop accepting rides:\n1. Complete any active trip first.\n2. Toggle the 'Go Online' switch to off.\n\nYou can go online again at any time. Let me know if you need further guidance."
  },
  {
    id: "d-gps-issue",
    role: "driver",
    category: "going_online",
    keywords: ["gps", "location", "gps not working", "location permission", "can't go online"],
    response: "GPS is required to go online and accept rides. If you're having GPS issues:\n1. Check that location permissions are enabled for the app.\n2. Ensure GPS is turned on in your device settings.\n3. Try restarting the app.\n\nIf the issue persists, submit a support ticket for assistance."
  },

  // Trip Acceptance
  {
    id: "d-trip-accept",
    role: "driver",
    category: "trip_acceptance",
    keywords: ["accept trip", "new trip", "trip request", "ride request", "incoming trip"],
    response: "When a trip request appears:\n1. Review the pickup location and trip details.\n2. Accept or decline within the time limit.\n\nAccepting trips consistently helps maintain your trust score. Let me know if you need further guidance."
  },
  {
    id: "d-trip-navigate",
    role: "driver",
    category: "trip_acceptance",
    keywords: ["navigate", "navigation", "directions", "map", "route"],
    response: "After accepting a trip, you can use your preferred navigation app for directions. ZIBA provides trip details including pickup and drop-off locations. Tap the navigation option to open directions in your GPS app."
  },

  // Rider Cancellation (Driver perspective)
  {
    id: "d-rider-cancelled",
    role: "driver",
    category: "rider_cancellation",
    keywords: ["rider cancelled", "rider canceled", "trip cancelled", "cancelled on me"],
    response: "If a rider cancels after you've started traveling to the pickup, a cancellation fee may be applied to the rider. The fee is processed automatically. Check your earnings for any applicable compensation. Let me know if you need further guidance."
  },

  // Lost Items (Driver)
  {
    id: "d-lost-found",
    role: "driver",
    category: "lost_item",
    keywords: ["found item", "rider left", "passenger left", "item in car", "found phone", "found bag"],
    response: "If you find a rider's item:\n1. Check the notification from the rider's report.\n2. Confirm that you found the item in the app.\n3. Choose to return it directly or drop it at a Safe Return Hub.\n\nDrivers are not required to return items, but many choose to. Hub drop-offs may earn a bonus reward."
  },
  {
    id: "d-lost-deny",
    role: "driver",
    category: "lost_item",
    keywords: ["didn't find", "no item", "not in car", "deny found"],
    response: "If you did not find the reported item:\n1. Open the lost item notification.\n2. Indicate that the item was not found.\n\nThe rider may submit additional details or a support ticket for further review. Your response is documented for records."
  },
  {
    id: "d-lost-hub-dropoff",
    role: "driver",
    category: "lost_item",
    keywords: ["drop at hub", "hub drop off", "safe return", "hub delivery"],
    response: "To drop off a found item at a Safe Return Hub:\n1. Select 'Return via Hub' in the lost item report.\n2. Choose a hub from the available list.\n3. Drop off the item and confirm in the app.\n\nHub drop-offs may earn a bonus reward. The rider will be notified when the item is at the hub."
  },

  // Accident Reporting (Driver)
  {
    id: "d-accident-report",
    role: "driver",
    category: "accident",
    keywords: ["accident", "crash", "collision", "hit", "damage", "injured"],
    response: "If there's an emergency, please contact local emergency services first. To report an accident:\n1. Open the Accident Report feature in your Safety Hub.\n2. Document the incident with photos and details.\n3. Submit the report.\n\nZIBA facilitates documentation and may connect you with relief fund resources based on eligibility.",
    priority: 10
  },
  {
    id: "d-accident-relief",
    role: "driver",
    category: "accident",
    keywords: ["relief fund", "accident fund", "financial help", "accident support", "claim"],
    response: "The Driver Accident Relief Fund may provide support for verified accidents. Eligibility depends on:\n- Accident verification\n- Fault determination\n- Your trust score\n\nClaims are reviewed by the admin team. ZIBA facilitates documentation for your records. Submit a support ticket for more information."
  },

  // Wallet & Payouts (Driver)
  {
    id: "d-wallet-earnings",
    role: "driver",
    category: "driver_wallet",
    keywords: ["earnings", "income", "how much earned", "my earnings", "trip income"],
    response: "Your earnings and charges are shown in your trip summary. View details in the Earnings tab, including trip income, bonuses, and incentives. I can guide you through this if you want."
  },
  {
    id: "d-wallet-payout",
    role: "driver",
    category: "driver_wallet",
    keywords: ["payout", "withdraw", "cash out", "get paid", "when paid", "payout schedule"],
    response: "Payouts are processed through your configured payment method. To set up or manage payouts:\n1. Go to the Wallet tab.\n2. Add or update your bank or mobile money details.\n\nIdentity verification may be required for withdrawals based on your country's requirements. I can guide you through this if you want."
  },
  {
    id: "d-wallet-bank",
    role: "driver",
    category: "driver_wallet",
    keywords: ["bank details", "add bank", "change bank", "bank account", "mobile money"],
    response: "To manage your payout details:\n1. Go to the Wallet tab.\n2. Update your bank account or mobile money information.\n\nMake sure your details are correct to avoid payout delays. Identity verification may be required. Let me know if you need further guidance."
  },
  {
    id: "d-wallet-pending",
    role: "driver",
    category: "driver_wallet",
    keywords: ["pending payout", "payout delayed", "not received", "where is my money", "payout issue"],
    response: "If a payout seems delayed:\n1. Check your Wallet for the payout status.\n2. Verify that your bank or mobile money details are correct.\n3. Ensure your identity verification is complete.\n\nIf the issue persists, submit a support ticket and a support agent will look into this."
  },

  // Trust Score (Driver)
  {
    id: "d-trust-score",
    role: "driver",
    category: "trust_score",
    keywords: ["trust score", "my score", "rating", "score low", "improve score"],
    response: "Your trust score reflects your overall reliability on the platform. It considers ratings, trip completion, behavior signals, and safety record. To maintain or improve your score:\n- Complete trips consistently\n- Maintain professional service\n- Respond to rider reports promptly\n\nLet me know if you'd like more details."
  },

  // Troubleshooting (Driver)
  {
    id: "d-app-crash",
    role: "driver",
    category: "troubleshooting",
    keywords: ["app crash", "app not working", "app frozen", "stuck", "glitch", "bug"],
    response: "If you're experiencing app issues:\n1. Try refreshing the page or restarting the app.\n2. Check your internet connection.\n3. Clear your browser cache.\n\nIf the issue persists, submit a support ticket with details about what happened. Let me know if you need further guidance."
  },
  {
    id: "d-trip-issue",
    role: "driver",
    category: "troubleshooting",
    keywords: ["trip not ending", "trip stuck", "can't complete trip", "trip problem"],
    response: "If a trip seems stuck:\n1. Check your internet connection.\n2. Try refreshing the page.\n3. If the issue persists, submit a support ticket with the trip details.\n\nA support agent will look into this."
  },

  // Escalation (Driver)
  {
    id: "d-escalate",
    role: "driver",
    category: "escalation",
    keywords: ["talk to someone", "real person", "human", "support agent", "escalate", "speak to"],
    response: "I can forward this to our support team for review. Go to Help and tap 'Submit a Ticket'. A support agent will look into this. For urgent safety matters during a trip, use the SOS button."
  },

  // Driver Signup - Additional
  {
    id: "d-signup-vehicle",
    role: "driver",
    category: "driver_signup",
    keywords: ["vehicle requirements", "car requirements", "vehicle type", "eligible vehicle", "what car"],
    response: "Vehicle requirements vary by location but generally include:\n- Vehicle must be in good working condition\n- Must pass inspection requirements\n- Must have valid registration and insurance\n- Year and model restrictions may apply by market\n\nUpload your vehicle details during registration. We recommend checking local requirements for your area. Let me know if you need further guidance."
  },


  // Trip Management (Driver) - Additional
  {
    id: "d-trip-complete",
    role: "driver",
    category: "trip_acceptance",
    keywords: ["complete trip", "end trip", "finish trip", "trip done", "drop off complete"],
    response: "To complete a trip:\n1. Arrive at the drop-off location.\n2. Confirm the drop-off in the app.\n3. The trip will be marked as completed and earnings will be added to your account.\n\nMake sure to confirm completion only after the rider has exited safely. Let me know if you need further guidance."
  },
  {
    id: "d-trip-cancel",
    role: "driver",
    category: "trip_acceptance",
    keywords: ["cancel trip", "driver cancel", "can't do trip", "decline trip", "cancel accepted"],
    response: "If you need to cancel an accepted trip:\n1. Open the active trip screen.\n2. Select the cancel option and provide a reason.\n\nFrequent cancellations may affect your trust score. We recommend only canceling when necessary. Based on your situation, consider completing the trip if possible. Let me know if you need further guidance."
  },
  {
    id: "d-rider-rating",
    role: "driver",
    category: "trust_score",
    keywords: ["rate rider", "rider rating", "rate passenger", "rider behavior"],
    response: "After each trip, you can rate the rider:\n1. The rating prompt appears when the trip is completed.\n2. Select a star rating and optionally leave feedback.\n3. Submit your rating.\n\nYour ratings help maintain community standards and inform the trust system. Let me know if you need further guidance."
  },

  // Incentives (Driver)
  {
    id: "d-incentive",
    role: "driver",
    category: "driver_wallet",
    keywords: ["incentive", "incentive program", "bonus program", "driver incentive", "earn more"],
    response: "ZIBA helps facilitate incentive programs to reward active drivers. Incentive details vary by market and may include:\n- Trip completion bonuses\n- Peak hour multipliers\n- Weekly or monthly targets\n\nCheck your Earnings tab for current incentive opportunities. I can guide you through this if you want."
  },
  {
    id: "d-incentive-bonus",
    role: "driver",
    category: "driver_wallet",
    keywords: ["bonus", "bonus reward", "extra reward", "bonus earned", "where is bonus"],
    response: "Bonus rewards are credited to your driver wallet upon meeting the qualifying criteria. To check your bonuses:\n1. Go to the Earnings tab.\n2. Look for bonus entries in your transaction history.\n\nBonus amounts and criteria vary by program and market. Let me know if you need further guidance."
  },

  // Lost Item Chat (Driver)
  {
    id: "d-lost-chat",
    role: "driver",
    category: "lost_item",
    keywords: ["chat rider", "message rider", "contact rider", "in-app chat", "lost item chat"],
    response: "To communicate with a rider about a lost item:\n1. Open the lost item notification.\n2. Use the in-app messaging to coordinate return details.\n\nZIBA facilitates communication between you and the rider. We recommend keeping all communications within the app for documentation purposes. Let me know if you need further guidance."
  },

  // Safety (Driver) - Additional
  {
    id: "d-safety-sos",
    role: "driver",
    category: "safety",
    keywords: ["sos", "emergency", "driver emergency", "panic", "danger"],
    response: "If there's an emergency, please contact local emergency services first. During an active trip, use the SOS button for immediate assistance. ZIBA facilitates safety tools to help protect you on the road. Let me know if you need immediate assistance.",
    priority: 10
  },
  {
    id: "d-safety-incident",
    role: "driver",
    category: "safety",
    keywords: ["report incident", "driver incident", "rider behavior", "unsafe rider", "problem rider"],
    response: "To report a safety incident:\n1. Go to the Safety Hub from your Help tab.\n2. Select 'Report Incident'.\n3. Provide details about what happened.\n\nZIBA facilitates incident documentation and review. Your report will be reviewed by our team. Let me know if you need further guidance.",
    priority: 10
  },

  // Account (Driver) - Additional
  {
    id: "d-account-edit",
    role: "driver",
    category: "account",
    keywords: ["edit profile", "update profile", "change name", "change photo", "driver profile"],
    response: "To update your driver profile:\n1. Go to the Profile section.\n2. Edit your name, photo, or other details.\n3. Changes are saved automatically.\n\nSome profile changes may require re-verification. I can guide you through this if you want."
  },

  // Wallet (Driver) - Tax
  {
    id: "d-wallet-tax",
    role: "driver",
    category: "driver_wallet",
    keywords: ["tax", "tax statement", "tax document", "annual statement", "tax report", "1099"],
    response: "Tax statements summarize your earnings for reporting purposes. To access your tax documents:\n1. Go to the Statements section in your driver dashboard.\n2. Select the relevant tax period.\n3. Download or view your statement.\n\nWe recommend consulting a tax professional for guidance on your obligations. I can guide you through this if you want."
  },

  // ============================
  // ADMIN TEMPLATES (~30)
  // ============================

  // Driver & Trainee Approvals
  {
    id: "a-driver-approvals",
    role: "admin",
    category: "approval_management",
    keywords: ["driver approvals", "pending drivers", "approve driver", "review driver", "new applications"],
    response: "Driver approvals are managed in the Drivers tab.\n1. Filter by 'Pending Approval' to see new applications.\n2. Review submitted documents and vehicle information.\n3. Approve or reject based on verification status.\n\nAll actions are logged for audit purposes."
  },
  {
    id: "a-trainee-approvals",
    role: "admin",
    category: "approval_management",
    keywords: ["trainee", "training status", "trainee approval", "driver training"],
    response: "Trainee drivers are those who have registered but not yet been approved. Their training completion status is visible in the driver profile. Review their documents and training progress before making approval decisions."
  },
  {
    id: "a-bulk-approvals",
    role: "admin",
    category: "approval_management",
    keywords: ["bulk approve", "approve all", "multiple drivers", "batch approve"],
    response: "Driver approvals should be reviewed individually to ensure document verification is thorough. Each driver profile shows submitted identity documents, vehicle information, and verification status. We recommend reviewing each application carefully."
  },

  // Missing Approval Tabs
  {
    id: "a-missing-tab",
    role: "admin",
    category: "approval_management",
    keywords: ["missing tab", "can't find", "where is", "tab not showing", "no approval tab"],
    response: "Admin dashboard tabs are organized at the top of the page. If a tab seems missing:\n1. Check if you have the required admin role permissions.\n2. Try refreshing the page.\n3. Some tabs may be hidden based on your role level.\n\nIf the issue persists, submit a support ticket for review."
  },

  // Trust Score (Admin)
  {
    id: "a-trust-explain",
    role: "admin",
    category: "trust_score",
    keywords: ["trust score", "how trust works", "score calculation", "score breakdown"],
    response: "Trust scores are calculated from multiple signals: ratings, trip completion rates, incident history, and behavior patterns. The system applies anti-manipulation guards to prevent gaming. You can view detailed breakdowns in user profiles. Scores are updated periodically based on accumulated signals."
  },
  {
    id: "a-trust-override",
    role: "admin",
    category: "trust_score",
    keywords: ["adjust score", "override score", "modify trust", "reset score"],
    response: "Trust score adjustments require careful consideration. Administrative overrides are logged for audit purposes. Review the user's full profile, incident history, and behavior signals before making adjustments. All override actions are recorded in the compliance log."
  },

  // Lost Item Disputes (Admin)
  {
    id: "a-lost-dispute",
    role: "admin",
    category: "lost_item_dispute",
    keywords: ["lost item dispute", "item dispute", "lost item complaint", "item not returned"],
    response: "To review a lost item dispute:\n1. Check the lost item report for both rider and driver statements.\n2. Review any fraud signals (frequent reporter, GPS mismatch, etc.).\n3. Check communication history between rider and driver.\n4. Make a resolution decision based on evidence.\n\nAll actions are logged for audit purposes."
  },
  {
    id: "a-lost-fraud",
    role: "admin",
    category: "lost_item_dispute",
    keywords: ["frequent lost items", "suspicious lost", "lost item fraud", "false report"],
    response: "The fraud engine generates signals for lost item patterns including: frequent reporters, same item types, frequent accused drivers, GPS mismatches, and missing proof. Review the risk score and signal details before taking action. Avoid direct accusations in communications."
  },

  // Accident Tickets (Admin)
  {
    id: "a-accident-review",
    role: "admin",
    category: "accident_ticket",
    keywords: ["accident ticket", "accident report", "review accident", "accident claim"],
    response: "To review an accident report:\n1. Check the submitted documentation and photos.\n2. Review the fault determination.\n3. Assess relief fund eligibility if applicable.\n4. Process insurance referrals for moderate/severe cases.\n\nAll safety actions maintain an audit trail."
  },
  {
    id: "a-relief-fund",
    role: "admin",
    category: "accident_ticket",
    keywords: ["relief fund", "accident fund", "fund balance", "approve claim"],
    response: "The Driver Accident Relief Fund is managed through the Safety section. Review claims based on:\n- Accident verification\n- Fault determination (not at fault, shared, at fault)\n- Driver trust score and eligibility\n- Fund balance\n\nAll claim decisions are logged for audit purposes."
  },

  // Reports & Dashboards (Admin)
  {
    id: "a-dashboard",
    role: "admin",
    category: "reports",
    keywords: ["dashboard", "overview", "metrics", "kpi", "statistics"],
    response: "The Admin Dashboard provides an overview of platform operations. Key metrics include active trips, pending approvals, revenue, and safety incidents. Use the tabs at the top to navigate between management areas. Let me know if you need guidance on a specific section."
  },
  {
    id: "a-reports",
    role: "admin",
    category: "reports",
    keywords: ["reports", "financial report", "trip report", "payout report"],
    response: "Financial reports cover trip revenue, driver payouts, wallet balances, and settlement records. Access reports through the relevant dashboard tabs. The Payouts tab manages pending and completed driver payments. The Cash Settlement section handles cash trip reconciliation."
  },

  // Notifications & Inbox (Admin)
  {
    id: "a-inbox-viewer",
    role: "admin",
    category: "admin_notifications",
    keywords: ["inbox viewer", "user messages", "rider inbox", "driver inbox", "view messages"],
    response: "The Admin Inbox Viewer provides read-only access to rider and driver inbox messages. You can filter by message type and user ID. This helps review what communications users have received."
  },

  // User Complaints (Admin)
  {
    id: "a-complaint",
    role: "admin",
    category: "user_complaints",
    keywords: ["complaint", "user complaint", "rider complaint", "driver complaint", "handle complaint"],
    response: "To handle a user complaint:\n1. Review the support ticket details.\n2. Check relevant trip history and wallet context.\n3. Review any related disputes or incident reports.\n4. Respond through the support ticket system.\n\nAll actions are logged for compliance. Maintain neutral, professional language in all responses."
  },
  {
    id: "a-dispute-resolve",
    role: "admin",
    category: "user_complaints",
    keywords: ["resolve dispute", "dispute resolution", "settle dispute", "close dispute"],
    response: "Dispute management is in the Disputes tab. Review filed disputes, examine evidence from both parties, and make resolution decisions. You can issue refunds, apply penalties, or escalate to senior review. All actions are logged for audit purposes."
  },
  {
    id: "a-suspension",
    role: "admin",
    category: "user_complaints",
    keywords: ["suspend user", "ban user", "restrict user", "deactivate user"],
    response: "User suspensions and restrictions are available in the user management section. Before taking action:\n1. Review the user's full history.\n2. Document the reason for the action.\n3. Apply the appropriate restriction level.\n\nAll administrative actions are logged with timestamps and reasons for audit purposes."
  },

  // Document & Vehicle Review (Admin)
  {
    id: "a-approval-documents",
    role: "admin",
    category: "approval_management",
    keywords: ["review documents", "check documents", "document verification", "verify docs", "driver documents"],
    response: "To review driver documents:\n1. Go to the Drivers tab and select the driver profile.\n2. Review each submitted document for authenticity and completeness.\n3. Cross-check details against identity verification requirements.\n4. Approve or request re-submission as needed.\n\nAll document review actions are logged for audit purposes. Let me know if you need further guidance."
  },

  // User Management (Admin)
  {
    id: "a-user-search",
    role: "admin",
    category: "user_complaints",
    keywords: ["search user", "find user", "look up user", "user search", "find rider", "find driver"],
    response: "To search for a user:\n1. Use the search functionality in the admin dashboard.\n2. Search by name, email, or user ID.\n3. Select the user to view their full profile.\n\nUser search results include account status, role, and recent activity. Let me know if you need further guidance."
  },
  {
    id: "a-user-profile",
    role: "admin",
    category: "user_complaints",
    keywords: ["view profile", "user profile", "user details", "account details", "user info"],
    response: "User profiles in the admin dashboard display:\n- Account information and verification status\n- Trip history and activity\n- Trust score and behavior signals\n- Support ticket history\n- Any active restrictions or flags\n\nReview profiles thoroughly before taking administrative actions. All profile access is logged for audit purposes."
  },

  // Trip & Payout Review (Admin)
  {
    id: "a-trip-review",
    role: "admin",
    category: "reports",
    keywords: ["review trip", "trip details", "trip investigation", "check trip", "trip audit"],
    response: "To review trip details:\n1. Search for the trip by ID or user.\n2. Review the route, fare breakdown, and payment method.\n3. Check timestamps and status transitions.\n4. Review any associated disputes or incident reports.\n\nTrip data includes GPS records, fare calculations, and communication logs. Let me know if you need further guidance."
  },
  {
    id: "a-payout-process",
    role: "admin",
    category: "reports",
    keywords: ["process payout", "approve payout", "send payout", "payout processing", "release funds"],
    response: "To process driver payouts:\n1. Go to the Payouts section in the admin dashboard.\n2. Review pending payout requests.\n3. Verify driver identity and bank details.\n4. Approve and process the payout.\n\nAll payout actions are logged for audit purposes. We recommend verifying details before processing. Let me know if you need further guidance."
  },
  {
    id: "a-payout-pending",
    role: "admin",
    category: "reports",
    keywords: ["pending payouts", "payout queue", "waiting payouts", "unprocessed payouts"],
    response: "Pending payouts are listed in the Payouts section of the admin dashboard. Each entry shows the driver, amount, and submission date. Review pending payouts regularly to ensure timely processing. Based on your situation, filter by status or date range for efficient review. Let me know if you need further guidance."
  },
  {
    id: "a-cash-settlement",
    role: "admin",
    category: "reports",
    keywords: ["cash settlement", "cash reconciliation", "cash trip settlement", "settle cash"],
    response: "Cash trip settlements are managed in the Cash Settlement section. To review:\n1. Check outstanding cash balances for drivers.\n2. Review trip-by-trip cash collection records.\n3. Process settlements according to the configured schedule.\n\nZIBA helps facilitate transparent cash reconciliation. All settlement actions are logged. Let me know if you need further guidance."
  },

  // Safety (Admin)
  {
    id: "a-safety-sos",
    role: "admin",
    category: "escalation",
    keywords: ["sos review", "sos incident", "emergency report", "sos alert", "review sos"],
    response: "To review SOS incidents:\n1. Go to the Safety section in the admin dashboard.\n2. Check active and recent SOS alerts.\n3. Review incident details, location data, and user statements.\n4. Follow up with appropriate actions and documentation.\n\nSOS incidents require prompt attention. All review actions are logged for audit purposes. Let me know if you need further guidance.",
    priority: 10
  },
  {
    id: "a-safety-escalation",
    role: "admin",
    category: "escalation",
    keywords: ["escalation procedure", "escalate issue", "escalation process", "senior review"],
    response: "For escalation procedures:\n1. Review the full case history and documentation.\n2. Assess severity and determine the appropriate escalation level.\n3. Forward to senior review with a summary of findings.\n4. Document the escalation reason and expected resolution timeline.\n\nWe recommend including all relevant evidence when escalating. Let me know if you need further guidance."
  },

  // Notifications (Admin)

  // Fraud (Admin)
  {
    id: "a-fraud-review",
    role: "admin",
    category: "abuse_patterns",
    keywords: ["fraud review", "fraud flag", "suspicious activity", "review fraud", "fraud alert"],
    response: "To review fraud flags:\n1. Go to the fraud monitoring section.\n2. Review flagged accounts and their risk signals.\n3. Check for patterns across multiple data points.\n4. Document your findings before taking action.\n\nWe recommend building a case from multiple signals before making decisions. All review actions are logged for audit purposes. Let me know if you need further guidance."
  },

  // Wallet Review (Admin)
  {
    id: "a-wallet-review",
    role: "admin",
    category: "reports",
    keywords: ["review wallet", "user wallet", "wallet balance check", "wallet audit", "check wallet"],
    response: "To review a user's wallet:\n1. Search for the user in the admin dashboard.\n2. Open their wallet details to view balance and transaction history.\n3. Check for any pending or disputed transactions.\n4. Review top-up and payout records as needed.\n\nWallet reviews are logged for audit purposes. Let me know if you need further guidance."
  },

  // ============================
  // SUPER ADMIN TEMPLATES (~20)
  // ============================

  // System Configuration
  {
    id: "sa-config-overview",
    role: "super_admin",
    category: "system_config",
    keywords: ["system config", "configuration", "settings", "production switches"],
    response: "System configuration controls platform-wide settings, including production switches, test mode, simulation settings, and feature flags. Changes here affect all users. We recommend reviewing dependencies before modifying critical settings."
  },
  {
    id: "sa-config-test-mode",
    role: "super_admin",
    category: "system_config",
    keywords: ["test mode", "simulation", "sandbox", "testing"],
    response: "Test mode enables simulated payments and isolated testing. When test mode is active, real payment processing is bypassed. We recommend verifying that test mode is disabled before going live in any market."
  },

  // Feature Dependency Warnings
  {
    id: "sa-feature-deps",
    role: "super_admin",
    category: "feature_flags",
    keywords: ["feature dependency", "dependent features", "linked features", "breaking change"],
    response: "Some features have dependencies on other features or configurations. Before disabling or modifying a feature:\n1. Check for dependent features in the Feature Flags section.\n2. Review the monitoring dashboard for usage metrics.\n3. Consider the impact on active users.\n\nWe recommend testing changes in a controlled environment first."
  },
  {
    id: "sa-feature-rollout",
    role: "super_admin",
    category: "feature_flags",
    keywords: ["rollout", "gradual rollout", "feature release", "enable feature"],
    response: "Feature flags support gradual rollout per country. To roll out a feature:\n1. Enable the flag for a specific country.\n2. Monitor the dashboard for impact metrics.\n3. Expand to additional markets based on results.\n\nWe recommend reviewing flag impact metrics before making changes to production flags."
  },

  // Audit Preparation
  {
    id: "sa-audit-prep",
    role: "super_admin",
    category: "audit",
    keywords: ["audit", "audit preparation", "compliance audit", "prepare audit"],
    response: "For audit preparation:\n1. Review the Compliance Logs panel for timestamped acceptance records.\n2. Check legal acknowledgement logs for user consent coverage.\n3. Verify admin action audit trails are complete.\n4. Ensure country-specific compliance settings are current.\n\nWe recommend reviewing these regularly to ensure platform-wide compliance coverage."
  },
  {
    id: "sa-audit-logs",
    role: "super_admin",
    category: "audit",
    keywords: ["audit logs", "action logs", "admin logs", "compliance logs"],
    response: "Audit logs track all administrative actions with timestamps, user IDs, and action details. Access them through the Compliance Logs panel in the admin dashboard. You can filter by type, user, and date range."
  },

  // Abuse Pattern Summaries
  {
    id: "sa-abuse-patterns",
    role: "super_admin",
    category: "abuse_patterns",
    keywords: ["abuse patterns", "fraud patterns", "manipulation", "gaming system"],
    response: "Abuse patterns are detected through the fraud engine. Key patterns to watch:\n- Frequent lost item reporters\n- GPS mismatches between trips and reports\n- Unusual financial patterns\n- Coordinated behavior between accounts\n- Trust score manipulation attempts\n\nThe system aggregates signals into risk profiles for investigation."
  },
  {
    id: "sa-abuse-response",
    role: "super_admin",
    category: "abuse_patterns",
    keywords: ["respond abuse", "handle fraud", "fraud action", "abuse action"],
    response: "When responding to detected abuse patterns:\n1. Review the aggregated risk profile.\n2. Check for corroborating signals across multiple data points.\n3. Apply graduated responses (warning, restriction, suspension).\n4. Document all actions for audit purposes.\n\nAvoid taking action based on a single signal. We recommend building a case from multiple signals."
  },

  // Risky Action Explanations
  {
    id: "sa-risky-killswitch",
    role: "super_admin",
    category: "risky_actions",
    keywords: ["kill switch", "disable feature", "emergency disable"],
    response: "Kill switches allow immediate feature disabling per country. These are safety controls for emergencies. Before using a kill switch:\n1. Check dependent features that may be affected.\n2. Notify relevant team members.\n3. Document the reason for activation.\n\nDisabling is instant, but re-enabling should be done with verification."
  },
  {
    id: "sa-risky-country",
    role: "super_admin",
    category: "risky_actions",
    keywords: ["launch country", "new market", "enable country", "country launch"],
    response: "Before launching a new country:\n1. Verify all country-specific configurations (currency, tax, identity).\n2. Review legal compliance for the market.\n3. Use Launch Readiness to check all requirements.\n4. Ensure kill switches are configured for the new market.\n\nWe recommend a phased launch approach."
  },

  // Compliance Reminders
  {
    id: "sa-compliance-check",
    role: "super_admin",
    category: "compliance",
    keywords: ["compliance check", "compliance status", "regulatory", "legal compliance"],
    response: "Compliance checks should cover:\n1. Legal acknowledgement coverage across all user types.\n2. Country-specific terms and conditions currency.\n3. Consent tracking completeness.\n4. Admin action audit trail integrity.\n\nReview the Compliance Logs panel for detailed records. We recommend scheduling regular compliance reviews."
  },
  {
    id: "sa-compliance-consent",
    role: "super_admin",
    category: "compliance",
    keywords: ["consent", "user consent", "consent tracking", "gdpr", "data privacy"],
    response: "User consent is tracked through the legal acknowledgement system. Every disclaimer acceptance is logged with timestamps. Review consent coverage in the Compliance Logs panel. Ensure that all user-facing legal changes trigger new consent requirements."
  },
  {
    id: "sa-compliance-country",
    role: "super_admin",
    category: "compliance",
    keywords: ["country compliance", "market compliance", "local laws", "jurisdiction"],
    response: "Each country has specific compliance requirements configured in the system. Review country-specific settings including:\n- Arbitration clauses\n- Consumer protection notes\n- Cash handling disclaimers\n- Data privacy requirements\n\nEnsure all country addenda are current and aligned with local regulations."
  },

  // System Configuration - Additional
  {
    id: "sa-config-currency",
    role: "super_admin",
    category: "system_config",
    keywords: ["currency", "currency config", "exchange rate", "currency settings", "local currency"],
    response: "Currency configuration controls how fares, payouts, and wallet balances are displayed and processed per market. To manage currency settings:\n1. Go to the System Configuration section.\n2. Select Currency settings for the target country.\n3. Verify currency code, symbol, and decimal precision.\n\nWe recommend testing currency changes in a controlled environment before applying to production. Let me know if you need further guidance."
  },
  {
    id: "sa-config-identity",
    role: "super_admin",
    category: "system_config",
    keywords: ["identity config", "identity verification", "kyc config", "verification settings"],
    response: "Identity verification configuration controls the requirements for user and driver onboarding per market. Settings include:\n- Required document types\n- Verification provider configuration\n- Liveness check requirements\n- Re-verification intervals\n\nWe recommend reviewing country-specific regulations before modifying identity settings. Let me know if you need further guidance."
  },

  // Risky Actions - Additional

  // Monitoring
  {
    id: "sa-monitoring-kpi",
    role: "super_admin",
    category: "reports",
    keywords: ["kpi", "key performance", "metrics dashboard", "performance indicators", "monitor kpi"],
    response: "KPI monitoring provides real-time visibility into platform health. Key indicators include:\n- Active trips and driver availability\n- Trip completion rates\n- Average response times\n- Revenue and payout metrics\n- Safety incident rates\n\nReview KPIs regularly to identify trends and address issues proactively. Let me know if you need further guidance."
  },
  {
    id: "sa-monitoring-alerts",
    role: "super_admin",
    category: "reports",
    keywords: ["alerts", "alert management", "system alerts", "monitoring alerts", "configure alerts"],
    response: "Alert management allows you to configure notifications for critical system events. To manage alerts:\n1. Go to the monitoring configuration section.\n2. Set thresholds for key metrics.\n3. Configure notification channels and recipients.\n4. Review and adjust alert sensitivity as needed.\n\nWe recommend starting with conservative thresholds and adjusting based on operational patterns. Let me know if you need further guidance."
  },

  // Legal
  {
    id: "sa-legal-terms",
    role: "super_admin",
    category: "compliance",
    keywords: ["terms conditions", "legal terms", "update terms", "terms management", "tos"],
    response: "Terms and conditions management covers platform-wide legal documents. To update terms:\n1. Review the current terms version and change history.\n2. Draft updates with legal review.\n3. Configure re-consent requirements for affected users.\n4. Deploy changes with appropriate notice period.\n\nAll terms changes trigger consent tracking updates. We recommend legal review before publishing any modifications. Let me know if you need further guidance."
  },

  // ============================
  // DIRECTOR TEMPLATES (~25)
  // ============================

  // Cell Management
  {
    id: "d-cell-overview",
    role: "director",
    category: "director_cell",
    keywords: ["cell", "my cell", "driver cell", "how many drivers", "cell size", "capacity"],
    response: "Your cell overview is available on your Director Dashboard. It shows your total drivers, active drivers today, and eligible drivers. Cell sizes have maximum limits set by policy. Check your dashboard for current numbers."
  },
  {
    id: "d-cell-limit",
    role: "director",
    category: "director_cell",
    keywords: ["cell limit", "max drivers", "cell full", "maximum", "capacity limit", "1300"],
    response: "Each director cell has a maximum driver capacity. When your cell reaches capacity, no additional drivers can be added. Contact administration if you believe an adjustment is warranted."
  },
  {
    id: "d-cell-active",
    role: "director",
    category: "director_cell",
    keywords: ["active drivers", "drivers working", "drivers today", "who is active", "working today"],
    response: "Active drivers are those who have completed at least one trip today. This count resets daily. Your dashboard shows the current active count. Only active drivers factor into daily eligibility calculations."
  },

  // Commission Eligibility
  {
    id: "d-commission-how",
    role: "director",
    category: "director_commission",
    keywords: ["commission", "how commission works", "earn", "earnings", "how do I earn", "payment"],
    response: "Commission eligibility is calculated daily based on your active drivers. Only a portion of active drivers count toward eligibility, and caps apply. Rates and ratios are set by policy and may change. Check your dashboard for current eligibility status."
  },
  {
    id: "d-commission-eligibility",
    role: "director",
    category: "director_commission",
    keywords: ["eligible", "eligibility", "qualify", "qualification", "commissionable", "when do I start"],
    response: "To become eligible, you must first meet the minimum driver recruitment threshold. Once activated, daily eligibility depends on how many of your drivers are active that day. A policy-defined portion of active drivers determines your eligible count, subject to daily caps."
  },
  {
    id: "d-commission-daily",
    role: "director",
    category: "director_commission",
    keywords: ["daily", "per day", "today commission", "daily calculation", "daily earnings"],
    response: "Eligibility is recalculated every day based on that day's driver activity. Past performance does not guarantee future eligibility. Each day starts fresh with new activity counts."
  },
  {
    id: "d-commission-caps",
    role: "director",
    category: "director_commission",
    keywords: ["cap", "caps", "maximum commission", "limit", "ceiling", "driver cap"],
    response: "Caps and ratios apply to daily eligibility calculations. These are set by policy and may be adjusted. The caps ensure fair distribution across the platform. Check with administration for current policy details."
  },
  {
    id: "d-commission-frozen",
    role: "director",
    category: "director_commission",
    keywords: ["frozen", "freeze", "commission frozen", "suspended commission", "paused"],
    response: "If your commissions are frozen, this is an administrative action. Contact your administrator or support for clarification. Frozen status can be reversed by authorized personnel when appropriate."
  },
  {
    id: "d-commission-rate",
    role: "director",
    category: "director_commission",
    keywords: ["rate", "percentage", "commission rate", "how much percent", "what percentage"],
    response: "Commission rates are set by policy and may be adjusted by administration. Specific rate details are managed at the platform level. Focus on growing your active driver count for best results."
  },
  {
    id: "d-commission-promise",
    role: "director",
    category: "director_commission",
    keywords: ["guarantee", "promised", "owed", "entitled", "right to", "must pay"],
    response: "Commission eligibility is variable and calculated daily. There are no guarantees or fixed amounts. Eligibility depends on daily driver activity, policy-defined ratios, and applicable caps. We recommend focusing on driver performance and recruitment."
  },

  // Driver Management
  {
    id: "d-drivers-suspend",
    role: "director",
    category: "director_drivers",
    keywords: ["suspend driver", "remove driver", "discipline", "deactivate driver", "deactivate"],
    response: "Contract directors can suspend drivers under their cell for performance or disciplinary reasons. Go to your 'My Drivers' tab and use the Suspend action. Note: Only administrators can permanently deactivate drivers."
  },
  {
    id: "d-drivers-activate",
    role: "director",
    category: "director_drivers",
    keywords: ["activate driver", "unsuspend", "restore driver", "reactivate driver"],
    response: "You can activate suspended drivers under your cell from the 'My Drivers' tab. This will change their status back to approved, allowing them to accept trips again."
  },
  {
    id: "d-drivers-performance",
    role: "director",
    category: "director_performance",
    keywords: ["driver performance", "underperforming", "not working", "lazy", "inactive"],
    response: "Monitor driver activity through your dashboard. Active drivers are those completing trips daily. Consider reaching out to inactive drivers to understand any issues. If disciplinary action is needed, you can suspend drivers from your cell."
  },
  {
    id: "d-drivers-list",
    role: "director",
    category: "director_drivers",
    keywords: ["my drivers", "driver list", "see drivers", "view drivers", "all drivers"],
    response: "Your complete driver list is in the 'My Drivers' tab on your dashboard. It shows each driver's name, status, how they were assigned, and when they joined your cell."
  },

  // Recruiting (Contract Directors)
  {
    id: "d-recruit-how",
    role: "director",
    category: "director_recruiting",
    keywords: ["recruit", "recruiting", "referral", "invite drivers", "grow cell", "add drivers"],
    response: "Contract directors recruit drivers using their referral code. When a new driver signs up using your code, they are automatically assigned to your cell. Share your referral code through appropriate channels to grow your team."
  },
  {
    id: "d-recruit-threshold",
    role: "director",
    category: "director_recruiting",
    keywords: ["minimum drivers", "threshold", "10 drivers", "activation requirement", "how many to start"],
    response: "There is a minimum driver recruitment threshold before commission eligibility activates. Your dashboard shows your current progress toward this threshold. Focus on recruiting quality drivers who will be active on the platform."
  },
  {
    id: "d-recruit-referral",
    role: "director",
    category: "director_recruiting",
    keywords: ["referral code", "my code", "share code", "where is my code"],
    response: "Your referral code is managed through the platform. Drivers who sign up using your code are automatically added to your cell. Contact support if you need help locating or managing your referral code."
  },

  // Director Authority
  {
    id: "d-authority-limits",
    role: "director",
    category: "director_cell",
    keywords: ["what can I do", "permissions", "authority", "my powers", "allowed"],
    response: "Directors can view their cell metrics, monitor driver performance, and manage driver status within their cell. Contract directors can also recruit drivers. Administrative actions like permanent deactivation, commission changes, and platform settings are managed by administrators."
  },
  {
    id: "d-authority-override",
    role: "director",
    category: "director_cell",
    keywords: ["override", "admin override", "overruled", "changed by admin", "admin changed"],
    response: "Administrators and Super Administrators have ultimate authority over all platform operations, including the ability to override director actions, reassign drivers, and adjust policies. Director actions are subject to administrative review."
  },

  // Emotional / Entitlement
  {
    id: "d-emotional-frustrated",
    role: "director",
    category: "emotional",
    keywords: ["unfair", "frustrated", "angry", "not right", "cheated", "cheating", "scam"],
    response: "I understand this can be challenging. Commission eligibility is designed to be fair and transparent, calculated daily based on clear criteria. I recommend focusing on growing your active driver count, which directly impacts your eligibility. If you have specific concerns, please contact support for assistance."
  },
  {
    id: "d-emotional-entitled",
    role: "director",
    category: "emotional",
    keywords: ["deserve", "entitled", "owed", "should get", "right to more"],
    response: "I understand your perspective. Eligibility is calculated based on daily driver activity and policy-defined criteria. There are no fixed entitlements or guaranteed amounts. We recommend focusing on driver performance and recruitment, which are the factors within your control."
  },

  // Identity
  {
    id: "d-identity",
    role: "director",
    category: "identity",
    keywords: ["who are you", "are you ai", "are you real", "bot", "human", "artificial"],
    response: "I'm ZIBA Support. I'm here to help you navigate ZIBA and answer questions about your director dashboard, cell management, and eligibility criteria."
  },

  // General Help
  {
    id: "d-general-help",
    role: "director",
    category: "general_help",
    keywords: ["help", "how to", "guide", "tutorial", "get started"],
    response: "As a director, your main tools are:\n1. Dashboard - View cell metrics and daily activity\n2. My Drivers - Manage drivers in your cell\n3. Performance monitoring - Track active vs. inactive drivers\n\nFocus on keeping drivers active and your cell growing. Commission eligibility is calculated daily based on driver activity."
  },

  // Director Lifecycle & Status
  {
    id: "d-status-suspended",
    role: "director",
    category: "director_lifecycle",
    keywords: ["suspended", "my suspension", "why suspended", "account suspended", "can't access"],
    response: "Your director account is currently suspended. During suspension, commission calculations are paused and driver management actions are restricted. You can submit an appeal through your dashboard if you believe this should be reviewed. Appeals are handled according to platform policy."
  },
  {
    id: "d-status-terminated",
    role: "director",
    category: "director_lifecycle",
    keywords: ["terminated", "fired", "removed", "ended", "role ended", "no longer director"],
    response: "Your Director role has been ended based on review. Driver assignments have been updated. If you wish to contest this decision, you may submit an appeal through the appeals section. All appeals are reviewed according to platform policy."
  },
  {
    id: "d-status-pending",
    role: "director",
    category: "director_lifecycle",
    keywords: ["pending", "not activated", "waiting", "when will I start", "onboarding"],
    response: "Your director account is in the onboarding phase. Complete the onboarding steps shown on your dashboard to activate your account. Once onboarding is complete and you meet the minimum driver threshold, you can begin managing your cell."
  },
  {
    id: "d-appeal-process",
    role: "director",
    category: "director_appeals",
    keywords: ["appeal", "contest", "dispute decision", "challenge", "unfair decision", "review my case"],
    response: "You can submit an appeal through your director dashboard. Include the reason for your appeal and any supporting explanation. Your appeal will be reviewed by administration. Outcomes depend on policy and the specifics of your case. Review timelines are not fixed and vary by case."
  },
  {
    id: "d-appeal-status",
    role: "director",
    category: "director_appeals",
    keywords: ["appeal status", "my appeal", "appeal update", "when will appeal", "appeal decision"],
    response: "You can check the status of your appeals on your dashboard. Appeals are reviewed by administration according to policy. We cannot provide specific timelines and outcomes are not predetermined. Each case is assessed individually."
  },
  {
    id: "d-reinstatement",
    role: "director",
    category: "director_lifecycle",
    keywords: ["reinstate", "reinstatement", "get back", "restore", "reactivate my account"],
    response: "Reinstatement decisions are made by administration based on policy review. If your account has been suspended or terminated, you may submit an appeal through your dashboard. We cannot promise or guarantee reinstatement."
  },

  // De-escalation - Director specific (Phase 19)
  {
    id: "d-angry-deescalate",
    role: "director",
    category: "director_deescalation",
    keywords: ["this is wrong", "you are wrong", "system is broken", "not working properly", "bug", "error in system"],
    response: "I understand your concern. Let me help clarify your situation. Your dashboard shows your current metrics and status. If something appears incorrect, I recommend submitting a support ticket with specific details so our team can investigate. Is there a particular metric or action you need help understanding?"
  },
  {
    id: "d-threat-quit",
    role: "director",
    category: "director_deescalation",
    keywords: ["quit", "leave", "resign", "done with this", "leaving platform", "walk away", "give up"],
    response: "I understand this may be a difficult decision. Your director dashboard has all the information about your current cell and status. If you have unresolved concerns, consider submitting a support ticket or appeal before making a final decision. We're here to help address any specific issues you're facing."
  },
  {
    id: "d-demand-data",
    role: "director",
    category: "director_deescalation",
    keywords: ["show me the numbers", "real data", "internal data", "actual revenue", "how much money", "platform revenue", "company earnings"],
    response: "I understand your concern. Your director dashboard provides all the metrics relevant to your role, including driver counts, activity levels, and eligibility status. Internal platform financial data is confidential and not shared with individual accounts. If you have questions about your specific metrics, I can help explain what your dashboard shows."
  },
  {
    id: "d-accusation-cheating",
    role: "director",
    category: "director_deescalation",
    keywords: ["you're cheating me", "platform is cheating", "stealing from me", "manipulating", "rigged", "rigging"],
    response: "I understand this is frustrating. Commission eligibility is calculated daily using transparent criteria visible on your dashboard. The calculation follows consistent rules applied equally to all directors. If you believe there is a specific error in your metrics, please submit a support ticket with details and our team will investigate."
  },
  {
    id: "d-demand-more",
    role: "director",
    category: "director_deescalation",
    keywords: ["want more", "need more money", "pay more", "increase my rate", "higher commission", "raise"],
    response: "I understand your concern. Commission rates and eligibility criteria are set at the platform level and apply equally to all directors. These are periodically reviewed by administration. The most effective way to improve your eligibility is to focus on growing your active driver count. Higher daily activity directly impacts your daily eligibility calculation."
  },

  // ============================
  // CROSS-ROLE TEMPLATES
  // ============================

  // Identity
  {
    id: "x-identity",
    role: ["rider", "driver", "admin", "super_admin", "director", "general"],
    category: "identity",
    keywords: ["are you ai", "are you a bot", "are you real", "are you human", "what are you", "who are you"],
    response: "I'm ZIBA Support. I'm here to help you navigate ZIBA and resolve common issues quickly.",
    priority: 100
  },

  // Emotional / Frustration Handling
  {
    id: "x-frustrated",
    role: ["rider", "driver", "admin", "super_admin", "director", "general"],
    category: "emotional",
    keywords: ["angry", "frustrat", "furious", "upset", "terrible", "worst", "horrible", "hate", "unacceptable", "disgusting", "ridiculous"],
    response: "I understand this is frustrating. I can help explain the options available. Based on your situation, would you like me to guide you through the next steps, or would you prefer to submit a support ticket for a detailed review?",
    priority: 90
  },
  {
    id: "x-blame",
    role: ["rider", "driver", "admin", "super_admin", "director", "general"],
    category: "emotional",
    keywords: ["your fault", "you're responsible", "blame", "caused this"],
    response: "I understand your concern. I can help explain the options available to you. Would you like me to walk you through the relevant steps, or would you prefer to connect with our support team?",
    priority: 90
  },
  {
    id: "x-thanks",
    role: ["rider", "driver", "admin", "super_admin", "director", "general"],
    category: "emotional",
    keywords: ["thank", "thanks", "thank you", "appreciated"],
    response: "Thanks for reaching out. Let me know if you'd like help with anything else.",
    priority: 80
  },

  // Legal Threats
  {
    id: "x-legal-threat",
    role: ["rider", "driver", "admin", "super_admin", "director", "general"],
    category: "legal_threat",
    keywords: ["sue", "lawyer", "legal action", "court", "lawsuit", "attorney"],
    response: "I understand your concern. For matters requiring formal review, we recommend submitting a support ticket through the Help Center with full details. Our team handles these cases with appropriate attention. ZIBA's terms and policies are available in the Legal section for your reference.",
    priority: 95
  },

  // Fraud Attempts
  {
    id: "x-fraud-frequent-loss",
    role: ["rider", "driver", "general"],
    category: "fraud_attempt",
    keywords: ["lost item every", "keep losing", "always lose", "another lost item", "lost again"],
    response: "To report a lost item:\n1. Go to Activity and find the trip.\n2. Tap 'Report Lost Item' and provide details.\n\nEach report is documented and reviewed. Drivers are not required to return items, but many choose to. Let me know if you need further guidance.",
    priority: 85
  },

  // System Failure
  {
    id: "x-system-broken",
    role: ["rider", "driver", "admin", "super_admin", "director", "general"],
    category: "system_failure",
    keywords: ["broken", "nothing works", "app broken", "everything broken", "not working", "app down", "site down"],
    response: "I understand this is frustrating. Let's try a few steps:\n1. Refresh the page or restart the app.\n2. Check your internet connection.\n3. Clear your browser cache.\n\nIf the issue persists, submit a support ticket with details about what you're experiencing. A support agent will look into this.",
    priority: 85
  },

  // Aggressive Payment Dispute
  {
    id: "x-unfair-charge",
    role: ["rider", "driver", "general"],
    category: "payment",
    keywords: ["unfairly", "rip off", "scam", "stealing", "theft", "robbed"],
    response: "I understand your concern about this charge. Your charges are shown in your trip summary. To request a review:\n1. Go to Activity and find the relevant trip.\n2. Review the fare breakdown.\n3. Submit a support ticket with details if you'd like a formal review.\n\nA support agent will look into this. Every case is reviewed individually.",
    priority: 85
  },

  // Aggressive Driver (reported by rider)
  {
    id: "x-aggressive-driver-report",
    role: "rider",
    category: "safety",
    keywords: ["aggressive driver", "threatening driver", "driver threatened", "violent driver"],
    response: "If there's an emergency, please contact local emergency services first. To report this:\n1. Go to the Safety Hub.\n2. Select 'Report Incident'.\n3. Provide details about what happened.\n\nZIBA facilitates incident documentation and review. Your safety report will be reviewed by our team. Let me know if you need immediate assistance.",
    priority: 95
  },

  // Aggressive behavior (driver refusing to return)
  {
    id: "x-driver-refuse-return",
    role: ["rider", "admin"],
    category: "lost_item",
    keywords: ["won't return", "refuses to return", "keeping my item", "not giving back", "paid more"],
    response: "Drivers are not required to return items. However, ZIBA facilitates communication and provides options like Safe Return Hubs to coordinate returns. If you're experiencing difficulty:\n1. Check the lost item report for status updates.\n2. Submit a support ticket for additional assistance.\n\nOur team can help facilitate further communication.",
    priority: 80
  },

  // Role Confusion
  {
    id: "x-role-confusion-admin",
    role: "admin",
    category: "role_confusion",
    keywords: ["book ride", "my ride", "my wallet", "my earnings", "my payout"],
    response: "This admin panel is for platform management. For personal account actions like booking rides or managing your wallet, please switch to the appropriate user view. Let me know if you need guidance on admin functions instead."
  },
  {
    id: "x-role-confusion-driver",
    role: "driver",
    category: "role_confusion",
    keywords: ["approve driver", "manage users", "admin dashboard", "admin panel"],
    response: "Those features are available to platform administrators. As a driver, I can help you with going online, earnings, payouts, trip management, and more. What would you like help with?"
  },

  // General Escalation
  {
    id: "x-escalate-rider",
    role: "rider",
    category: "escalation",
    keywords: ["talk to someone", "real person", "human agent", "support agent", "escalate", "speak to", "ticket"],
    response: "I can forward this to our support team for review. Go to Help Center and tap 'Submit a Ticket'. A support agent will look into this. For urgent safety matters, please use the SOS button during an active trip."
  },
  {
    id: "x-escalate-admin",
    role: ["admin", "super_admin"],
    category: "escalation",
    keywords: ["escalate", "help", "support", "assistance"],
    response: "For complex operational issues, check the relevant dashboard tab or escalate through internal channels. The compliance logs and audit trails provide detailed records for investigation."
  },

  // General Help / Default
  {
    id: "d-coach-low-activity",
    role: "director",
    category: "director_coaching",
    keywords: ["low activity", "inactive drivers", "quiet cell", "no trips", "activity drop"],
    response: "Your cell activity has been lower than usual. Consider reaching out to your drivers to understand any challenges they may be facing. Consistent engagement helps maintain a healthy cell."
  },
  {
    id: "d-coach-high-suspensions",
    role: "director",
    category: "director_coaching",
    keywords: ["many suspensions", "too many suspended", "suspension rate", "high suspensions", "driver discipline"],
    response: "Your cell shows a higher than expected suspension rate. Review your driver management approach and consider whether additional training or support could reduce suspensions. A healthy cell balances accountability with driver retention."
  },
  {
    id: "d-coach-cell-health",
    role: "director",
    category: "director_coaching",
    keywords: ["cell health", "cell performance", "how is my cell", "cell status", "cell check"],
    response: "Your cell health is determined by active driver percentage, daily trip completion, and suspension rates. Check your Director Dashboard for current metrics. Focus on maintaining consistent driver engagement and addressing issues early."
  },
  {
    id: "d-coach-lifespan-expiry",
    role: "director",
    category: "director_coaching",
    keywords: ["contract expiry", "lifespan ending", "contract ending", "when does contract end", "renewal", "contract renewal"],
    response: "Your contract lifespan details are visible on your Director Dashboard. As your contract approaches its end date, keep your cell in good standing. Contact administration well in advance if you wish to discuss contract extension."
  },
  {
    id: "d-coach-multi-cell",
    role: "director",
    category: "director_coaching",
    keywords: ["multiple cells", "second cell", "third cell", "multi cell", "manage cells", "cell management tips"],
    response: "Managing multiple cells requires balanced attention across all your driver groups. Monitor each cell independently through your dashboard. Give each cell adequate attention, and distribute your management effort proportionally to cell size."
  },
  {
    id: "d-coach-staff-management",
    role: "director",
    category: "director_coaching",
    keywords: ["staff help", "manage staff", "team management", "staff roles", "staff performance"],
    response: "Your staff members assist with day-to-day cell operations. Assign clear responsibilities, review their performance regularly, and verify they follow platform guidelines. Staff actions are logged and visible to administration."
  },
  {
    id: "d-coach-performance-tip",
    role: "director",
    category: "director_coaching",
    keywords: ["improve performance", "better results", "growth tips", "how to grow", "director tips"],
    response: "To maintain strong performance: keep your active driver ratio healthy, address driver concerns promptly, monitor cell metrics daily, and engage with your team regularly. Consistent attention to these areas supports long-term success."
  },
  {
    id: "d-coach-capacity-warning",
    role: "director",
    category: "director_coaching",
    keywords: ["cell almost full", "approaching limit", "near capacity", "running out of space", "cell capacity warning"],
    response: "Your cell is approaching its maximum capacity. Focus on quality over quantity for your remaining slots. Confirm that new driver additions meet platform standards. If you need additional capacity, discuss options with administration."
  },

  // ============================
  // DRIVER COACHING TEMPLATES
  // ============================

  {
    id: "drv-coach-low-acceptance",
    role: "driver",
    category: "driver_coaching",
    keywords: ["low acceptance", "declining rides", "not accepting"],
    response: "Your ride acceptance rate has been lower recently. Accepting more ride requests helps build your profile and maintain good standing on the platform."
  },
  {
    id: "drv-coach-frequent-cancellations",
    role: "driver",
    category: "driver_coaching",
    keywords: ["cancellations", "cancelled rides", "too many cancels"],
    response: "We noticed some recent cancellations on your account. Completing rides you accept helps maintain a smooth experience for riders and supports your driver profile."
  },
  {
    id: "drv-coach-trust-dip",
    role: "driver",
    category: "driver_coaching",
    keywords: ["trust score", "trust dropped", "low trust"],
    response: "Your trust indicator has changed recently. Consistent, reliable ride completion and positive interactions help maintain strong trust levels. Keep up the great work on completed rides."
  },
  {
    id: "drv-coach-wallet-low",
    role: "driver",
    category: "driver_coaching",
    keywords: ["low balance", "wallet empty", "no funds"],
    response: "Your wallet balance is running low. A healthy balance ensures you can continue accepting rides without interruption. Consider topping up when convenient."
  },
  {
    id: "drv-coach-positive-streak",
    role: "driver",
    category: "driver_coaching",
    keywords: ["good performance", "great week", "doing well"],
    response: "You have been performing well recently. Consistent engagement and positive rider feedback strengthen your profile. Thank you for your continued dedication."
  },
  {
    id: "drv-coach-availability-tip",
    role: "driver",
    category: "driver_coaching",
    keywords: ["availability", "go online", "more rides"],
    response: "Staying available during peak hours can increase your ride opportunities. Check the app for busy times in your area and plan your availability accordingly."
  },

  // ============================
  // DIRECTOR FUNDING TEMPLATES
  // ============================

  {
    id: "d-funding-repayment",
    role: "director",
    category: "director_drivers",
    keywords: ["repayment", "pay back", "pay me back", "return money", "expect repayment", "get my money back", "reimburse"],
    response: "Funding is voluntary support and does not involve repayment or obligations. Director funding is a one-way transfer to support drivers. ZIBA does not facilitate, enforce, or track repayment of any kind. Any attempt to require repayment may result in a compliance review.",
    priority: 95
  },
  {
    id: "d-funding-require-online",
    role: "director",
    category: "director_drivers",
    keywords: ["stay online", "require online", "must be online", "force online", "demand online", "keep driving"],
    response: "Support funding should never be used to influence driver decisions. Drivers maintain full autonomy over when and how they use the platform. Conditioning funding on activity or availability is a policy violation and may trigger a compliance review.",
    priority: 95
  },
  {
    id: "d-funding-paused",
    role: "director",
    category: "director_drivers",
    keywords: ["funding paused", "can't fund", "funding suspended", "funding stopped", "why paused", "funding blocked"],
    response: "Your funding activity triggered a review to ensure fairness and compliance. Funding pauses are temporary and are lifted after admin review. You can view your funding history and limits on the Funding tab of your Director Dashboard.",
    priority: 90
  },
  {
    id: "d-funding-how",
    role: "director",
    category: "director_drivers",
    keywords: ["how to fund", "fund driver", "send money to driver", "support driver", "give money"],
    response: "To fund a driver's wallet:\n1. Go to your Director Dashboard.\n2. Open the Funding tab.\n3. Select an eligible driver from your cell.\n4. Enter the amount and select a purpose.\n5. Accept the disclaimer and confirm.\n\nFunding is subject to daily, weekly, and monthly limits.",
    priority: 85
  },
  {
    id: "d-funding-limits",
    role: "director",
    category: "director_drivers",
    keywords: ["funding limit", "how much can I fund", "maximum fund", "daily limit", "weekly limit", "monthly limit"],
    response: "Funding limits are configured by platform administrators and include per-transaction, per-driver, and per-director caps across daily, weekly, and monthly periods. Your remaining limits are displayed on the Funding tab of your Director Dashboard.",
    priority: 85
  },
  {
    id: "d-funding-conditions",
    role: "director",
    category: "director_drivers",
    keywords: ["condition", "conditional", "in exchange", "trade", "deal", "agreement", "contract"],
    response: "Director funding must be unconditional. You may not attach conditions, expectations, or agreements to wallet funding. Any attempt to create conditional funding arrangements is a policy violation. ZIBA monitors funding patterns for compliance.",
    priority: 95
  },

  {
    id: "dr-funding-payback",
    role: "driver",
    category: "driver_wallet",
    keywords: ["pay back", "repay", "owe", "pay this back", "repayment", "do I owe"],
    response: "No. Director funding is voluntary support and not a loan. You are under no obligation to repay, return, or compensate for any funding received from a director. If anyone suggests otherwise, please report it through the Help Center.",
    priority: 95
  },
  {
    id: "dr-funding-refuse",
    role: "driver",
    category: "driver_wallet",
    keywords: ["refuse funding", "reject funding", "don't want funding", "decline funding", "can I refuse"],
    response: "Yes. Accepting support is optional. Funding is credited to your wallet automatically, but you are never required to accept conditions or obligations in exchange for it. If a director implies conditions, please report it.",
    priority: 90
  },
  {
    id: "dr-funding-affect-account",
    role: "driver",
    category: "driver_wallet",
    keywords: ["affect account", "affect earnings", "change standing", "impact account", "funding impact"],
    response: "Support funding does not change your earnings or account standing. Your driver status, ratings, and earnings are determined independently by the platform. Director funding is a separate voluntary support mechanism.",
    priority: 90
  },
  {
    id: "dr-funding-coercion",
    role: "driver",
    category: "driver_wallet",
    keywords: ["coercion", "forced", "pressured", "threatened", "director demanding", "director forcing", "must stay online"],
    response: "No one may force, pressure, or coerce you based on funding. If you are experiencing this, please report it immediately through the Help Center or submit a support ticket. ZIBA takes coercion reports seriously and will investigate promptly.",
    priority: 100
  },

  {
    id: "a-funding-flags",
    role: ["admin", "super_admin"],
    category: "audit",
    keywords: ["funding flag", "flagged funding", "funding review", "funding abuse", "suspicious funding"],
    response: "Flagged director funding transactions are available in the Director Funding section of the admin panel. Flags are triggered by repeat funding patterns, threshold violations, or coercion reports. Review each case individually before taking action. No automatic punishments are applied without admin confirmation.",
    priority: 85
  },
  {
    id: "a-funding-patterns",
    role: ["admin", "super_admin"],
    category: "audit",
    keywords: ["funding pattern", "funding summary", "director funding overview", "who is funding"],
    response: "Director funding patterns can be reviewed in the Director Funding admin panel. Look for repeat funding to the same driver, funding amounts near limits, and timing patterns. The system automatically flags suspicious patterns for your review.",
    priority: 80
  },
  {
    id: "a-funding-suspend",
    role: ["admin", "super_admin"],
    category: "audit",
    keywords: ["suspend funding", "pause director funding", "stop director funding", "block funding"],
    response: "You can suspend a director's funding ability from the Director Funding admin panel. This temporarily prevents the director from sending funds while maintaining their other director privileges. Document the reason for the suspension in the notes field.",
    priority: 85
  },

  {
    id: "d-perf-score-meaning",
    role: "director",
    category: "director_performance",
    keywords: ["performance score", "my score", "what is my score", "DPS", "score meaning", "how scored"],
    response: "Your Director Performance Score (DPS) is a 0-100 rating based on five components: driver activity, driver quality, driver retention, compliance & safety, and admin feedback. It is recalculated periodically and determines your performance tier. This score is informational and does not guarantee income or status.",
    priority: 85
  },
  {
    id: "d-perf-tier-explain",
    role: "director",
    category: "director_performance",
    keywords: ["tier", "gold", "silver", "bronze", "at risk", "my tier", "performance tier"],
    response: "Performance tiers are assigned based on your score: Gold (85-100), Silver (70-84), Bronze (55-69), and At-Risk (below 55). Higher tiers may unlock discretionary benefits like expanded caps. Tiers are informational and do not constitute guarantees of any kind. ZIBA retains full discretion over tier-related decisions.",
    priority: 85
  },
  {
    id: "d-perf-improve",
    role: "director",
    category: "director_performance",
    keywords: ["improve score", "raise score", "better score", "increase score", "how to improve"],
    response: "To improve your performance score, focus on:\n1. Keeping drivers active and engaged daily\n2. Maintaining high driver trust scores\n3. Reducing driver suspensions and churn\n4. Addressing compliance flags promptly\n5. Responding to admin feedback constructively\n\nConsistent quality management is more effective than short-term boosts.",
    priority: 80
  },
  {
    id: "d-perf-score-dropped",
    role: "director",
    category: "director_performance",
    keywords: ["score dropped", "score went down", "lower score", "why did score drop", "score decrease"],
    response: "Score changes reflect shifts in your operational metrics over the most recent period. Common factors include reduced driver activity, increased suspensions, or new compliance flags. Review the component breakdown on your Performance tab for specific areas. Scores fluctuate naturally and a single drop does not indicate a permanent trend.",
    priority: 85
  },
  {
    id: "d-perf-incentive",
    role: "director",
    category: "director_performance",
    keywords: ["incentive", "reward", "bonus", "benefit", "perk", "what do I get"],
    response: "Incentives are discretionary recognitions that may be granted based on sustained performance. They can include temporary cap increases, priority access, or visibility boosts. Incentives are not guaranteed, not cash-based, and may be adjusted or revoked at any time. They do not constitute employment benefits or contractual obligations.",
    priority: 80
  },
  {
    id: "d-perf-restriction",
    role: "director",
    category: "director_performance",
    keywords: ["restriction", "restricted", "frozen", "can't add drivers", "limited", "why restricted"],
    response: "Restrictions are protective measures applied when performance falls below thresholds. They may include pausing new driver activations or requiring admin review. Restrictions are lifted automatically when your score improves above the threshold, or manually by an administrator after review. Focus on the improvement areas highlighted in your Performance tab.",
    priority: 85
  },
  {
    id: "d-perf-at-risk",
    role: "director",
    category: "director_performance",
    keywords: ["at risk", "at-risk", "below threshold", "poor performance", "will I be terminated"],
    response: "An At-Risk status means your performance metrics need attention. This is an opportunity to improve, not a penalty. Review your driver activity, quality, and compliance metrics. ZIBA provides guidance and time to address performance gaps. The platform retains discretion over all operational decisions.",
    priority: 90
  },

  // ============================
  // DIRECTOR TERMINATION, SUCCESSION & CELL CONTINUITY
  // ============================

  {
    id: "d-termination-process",
    role: "director",
    category: "director_termination",
    keywords: ["termination process", "how does termination work", "what happens when terminated", "termination steps"],
    response: "When a director is terminated, the platform follows a structured process:\n1. All director actions are immediately disabled.\n2. Pending payouts are frozen for review.\n3. Staff accounts under the director are disabled.\n4. Drivers are handled according to the succession plan determined by administration.\n5. Final payouts are resolved based on compliance review and admin decision.\n6. The director's audit trail is sealed for record-keeping.\n\nThis process is managed by administration. ZIBRA does not make promises regarding reinstatement or specific outcomes. If you have questions about your situation, contact support for guidance.",
    priority: 85
  },
  {
    id: "d-succession-planning",
    role: "director",
    category: "director_succession",
    keywords: ["succession", "replacement", "who takes over", "drivers reassigned", "new director"],
    response: "Succession is managed by Admin or Super Admin. When a director transition occurs, there are three possible outcomes for drivers and cell operations:\n1. Reassignment to an existing active director.\n2. Appointment of a new director to take over the cell.\n3. Temporary placement in the platform pool until a new director is assigned.\n\nDrivers are protected throughout the transition and continue operating without interruption. The specific succession path is determined by administration based on operational needs.",
    priority: 80
  },
  {
    id: "d-driver-protection-changes",
    role: "director",
    category: "director_termination",
    keywords: ["what happens to my drivers", "are drivers safe", "driver impact", "drivers during termination"],
    response: "Drivers always remain active during director transitions. There is no impact to driver earnings, account standing, or operational access. Drivers receive a neutral notification about the change without details about the reason. Administration decides the reassignment plan. ZIBRA does not inform drivers prematurely or share internal decision details.",
    priority: 85
  },
  {
    id: "d-staff-during-termination",
    role: "director",
    category: "director_termination",
    keywords: ["what happens to staff", "staff accounts", "team access", "staff during termination"],
    response: "All staff accounts associated with a terminated director are immediately disabled upon termination. Staff data and activity records are preserved for audit purposes. Staff members may be rehired and reassigned under a new director if administration determines it is appropriate. Staff are notified of the change through the platform.",
    priority: 80
  },
  {
    id: "d-payout-termination",
    role: "director",
    category: "director_termination",
    keywords: ["payout during termination", "final payout", "money owed", "payment after termination", "will I get paid"],
    response: "Final eligible payouts are calculated according to all applicable caps and compliance rules. Administration reviews the payout and decides the resolution, which may include: full release, hold for further review, partial release, or forfeiture based on compliance findings. The director is notified of the decision through the platform. ZIBRA does not discuss specific payout amounts or make commitments regarding payout outcomes.",
    priority: 85
  },
  {
    id: "d-contract-expiration",
    role: "director",
    category: "director_lifecycle",
    keywords: ["contract expiring", "contract end", "renewal", "extension", "when does contract end"],
    response: "Contract expiration follows the lifespan dates set during your appointment. There is no automatic renewal of director contracts. If a Super Admin determines an extension is appropriate, they may extend your contract before it expires. Review your contract dates on your Director Dashboard and plan accordingly. Contact administration well in advance if you wish to discuss your contract status.",
    priority: 80
  },
  {
    id: "d-readonly-dashboard",
    role: "director",
    category: "director_termination",
    keywords: ["dashboard locked", "cannot access", "read only", "dashboard disabled", "can't do anything"],
    response: "Your dashboard enters read-only mode during suspension, termination, or contract expiration. In this state, you can view your information, metrics, and history but cannot take any operational actions such as managing drivers or staff. If you believe this status was applied in error, contact support for a review of your account.",
    priority: 80
  },

  // Admin — Director Succession & Early Warning
  {
    id: "admin-succession-management",
    role: "admin",
    category: "director_succession",
    keywords: ["manage succession", "director succession", "replace director", "succession plan", "reassign directors drivers"],
    response: "To manage director succession:\n1. Create a succession plan by selecting the transition type, choosing a successor (existing director or new appointment), and setting the payout decision for the outgoing director.\n2. Review the ZIBRA-generated summary which highlights driver counts, compliance risks, and performance history.\n3. Execute the plan, which automatically handles driver reassignment, staff disabling, payout processing, and audit trail sealing.\n4. Monitor the succession timeline for completion status and address any flagged items.\n\nAll succession actions are logged for audit purposes.",
    priority: 80
  },
  {
    id: "admin-director-early-warning",
    role: "admin",
    category: "director_lifecycle",
    keywords: ["director expiring", "directors at risk", "expiring contracts", "early warning", "director alerts"],
    response: "Check the expiring directors list for contracts ending within 30 days. For each flagged director:\n1. Review their current performance score and cell health metrics.\n2. Check for any fraud signals or compliance concerns.\n3. Prepare a succession plan before the contract expires.\n\nZIBRA generates a summary for each at-risk director including active driver counts, compliance risk indicators, and recent performance history. Proactive planning prevents disruption to driver operations.",
    priority: 80
  },

  // THIRD-PARTY WALLET FUNDING SUPPORT

  {
    id: "r-third-party-funding-explain",
    role: "rider",
    category: "rider_coaching",
    keywords: ["third party funding", "someone fund my wallet", "how does funding work", "funded wallet", "sponsored"],
    response: "Third-party wallet funding lets trusted people like family members, friends, or employers add funds to your ZIBA wallet. It is a voluntary convenience feature \u2014 not a loan or financial service. The funder sends an invite, and you choose to accept or decline. You can revoke the link anytime."
  },
  {
    id: "r-funding-accept-decline",
    role: "rider",
    category: "rider_coaching",
    keywords: ["accept funding", "decline funding", "funding invite", "pending invite"],
    response: "When someone invites you to a funding relationship, you will receive a notification. You can accept to start receiving funds, or decline if you prefer not to. You can also revoke an accepted relationship at any time. No funds will be added without your explicit consent."
  },
  {
    id: "r-sponsored-funds-usage",
    role: "rider",
    category: "rider_coaching",
    keywords: ["sponsored funds", "how to use sponsored", "what can I spend", "funded balance"],
    response: "Sponsored funds in your wallet can be used for rides, cancellation fees, and lost-item return fees. They cannot be withdrawn as cash. By default, sponsored funds are used first when you take a ride, but you can adjust this in your wallet settings."
  },
  {
    id: "r-funding-revoke",
    role: "rider",
    category: "rider_coaching",
    keywords: ["revoke funding", "stop funding", "remove funder", "cancel funding link"],
    response: "You can revoke a funding relationship at any time from your wallet settings. Once revoked, the funder can no longer add funds to your wallet. Any remaining sponsored balance stays in your wallet until used. There are no penalties for revoking."
  },
  {
    id: "r-funding-privacy",
    role: "rider",
    category: "rider_coaching",
    keywords: ["can funder see my rides", "funding privacy", "what can funder see", "funder tracking"],
    response: "Your funder can see the total amount funded and general ride usage summaries. They cannot see your ride routes, driver identity, exact locations, or trust score details. Your privacy is protected."
  },
  {
    id: "r-funding-not-loan",
    role: "rider",
    category: "rider_coaching",
    keywords: ["is funding a loan", "repay funding", "owe money", "debt from funding"],
    response: "Third-party wallet funding is not a loan. There are no repayment obligations, interest, or debt. It is a voluntary gift from the funder. ZIBA does not act as a lender, escrow, or financial intermediary."
  },
  {
    id: "funder-setup-guide",
    role: "rider",
    category: "rider_coaching",
    keywords: ["how to fund someone", "fund another wallet", "setup funding", "invite to fund"],
    response: "To fund someone's wallet, go to Fund Another Wallet, search for the recipient by email, phone, or ZIBA ID, choose your relationship type, and set optional limits. The recipient must accept your invite before you can send funds. You can set daily and monthly limits and add a purpose tag."
  },
  {
    id: "funder-employer-setup",
    role: "rider",
    category: "rider_coaching",
    keywords: ["employer funding", "corporate funding", "employee wallet", "organization funding"],
    response: "Employers and organizations can fund employee wallets for work-related transportation. Set up a funding relationship as Employer-Employee, configure daily and monthly limits, and add a purpose tag like 'work commute'. The employee must accept the invite. You will see high-level usage summaries but not ride details."
  },

  {
    id: "x-general-help",
    role: ["rider", "driver", "admin", "super_admin", "director", "general"],
    category: "general_help",
    keywords: [],
    response: "Based on your question, we recommend checking the Help Center for detailed guidance. I can guide you through this if you want, or you can submit a support ticket for a detailed review.",
    priority: 0
  }
];

export interface ZibraLanguageConfig {
  supportedLanguages: string[];
  defaultLanguage: string;
  fallbackBehavior: string;
  rules: string[];
}

export const ZIBRA_LANGUAGE_CONFIG: ZibraLanguageConfig = {
  supportedLanguages: ["en", "en-NG", "en-SIMPLE", "es", "fr", "pt"],
  defaultLanguage: "en",
  fallbackBehavior: "If your preferred language is not yet available, I'll respond in English. We're working on adding more language options.",
  rules: [
    "Maintain consistent tone across all languages",
    "Preserve legal protections and disclaimers in every language",
    "Never mistranslate disclaimers or safety instructions",
    "Use formal, professional language without slang",
    "If translation unavailable, respond in English and acknowledge limitation",
    "Spanish (es), French (fr), and Portuguese (pt) are future-ready placeholders"
  ]
};

export interface ZibraTrainingSource {
  name: string;
  type: "primary" | "secondary" | "forbidden";
  description: string;
}

export const ZIBRA_TRAINING_SOURCES: ZibraTrainingSource[] = [
  { name: "App Feature Definitions", type: "primary", description: "UI routes, feature descriptions, and user-facing functionality" },
  { name: "Backend Business Rules", type: "primary", description: "Public-safe business logic including fare calculation, cancellation policies, and trip lifecycle" },
  { name: "Admin Policies", type: "primary", description: "Administrative procedures, approval workflows, and compliance requirements" },
  { name: "Safety & Lost Item Workflows", type: "primary", description: "SOS procedures, incident reporting, lost item protocol, Safe Return Hub process" },
  { name: "Accident Reporting Procedures", type: "primary", description: "Accident documentation, relief fund eligibility, insurance referral process" },
  { name: "Terms & Conditions", type: "primary", description: "Global terms, country-specific addenda, and legal disclaimers" },
  { name: "UI Route Definitions", type: "primary", description: "Screen context detection for providing relevant assistance" },
  { name: "Support Ticket Tags", type: "secondary", description: "Aggregated, anonymized ticket categories for identifying common issues" },
  { name: "Common User Error Patterns", type: "secondary", description: "Frequently encountered errors and their solutions" },
  { name: "Admin Review Notes", type: "secondary", description: "Non-personal administrative review patterns and outcomes" },
  { name: "Internal Financial Splits", type: "forbidden", description: "Commission rates, revenue sharing, and internal pricing models" },
  { name: "Private Employee Discussions", type: "forbidden", description: "Internal communications and decision-making processes" },
  { name: "Legal Advice Memos", type: "forbidden", description: "Internal legal strategy and counsel communications" },
  { name: "Personal User Data", type: "forbidden", description: "Individual user data beyond current session context" }
];

export function matchTemplate(
  input: string,
  role: ZibraRole,
  _context?: string
): ZibraTemplate | null {
  const lower = input.toLowerCase();

  const candidates: { template: ZibraTemplate; score: number }[] = [];

  for (const template of ZIBRA_TEMPLATES) {
    const roles = Array.isArray(template.role) ? template.role : [template.role];
    if (!roles.includes(role) && !roles.includes("general")) continue;

    if (template.keywords.length === 0) continue;

    let matchCount = 0;
    for (const keyword of template.keywords) {
      if (lower.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      const priority = template.priority ?? 50;
      const score = (matchCount / template.keywords.length) * 100 + priority;
      candidates.push({ template, score });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].template;
}

export function getTemplateResponse(
  input: string,
  role: ZibraRole,
  context?: string
): string {
  const matched = matchTemplate(input, role, context);
  if (matched) return matched.response;

  const fallback = ZIBRA_TEMPLATES.find(t => t.id === "x-general-help");
  return fallback?.response || "I can help you with that. Could you tell me a bit more about what you need? You can also submit a support ticket for detailed assistance.";
}

export function detectUserLanguage(
  profileLanguage?: string,
  _deviceLanguage?: string
): string {
  if (profileLanguage && ZIBRA_LANGUAGE_CONFIG.supportedLanguages.includes(profileLanguage)) {
    return profileLanguage;
  }
  return ZIBRA_LANGUAGE_CONFIG.defaultLanguage;
}
