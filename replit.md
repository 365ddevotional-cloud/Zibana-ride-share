# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application designed for emerging markets. Its primary purpose is to connect riders with drivers, offering a safe and reliable transportation solution. The platform supports seven distinct user roles to manage all aspects of operations, including trip coordination, financial oversight, and customer support. ZIBA aims to be a scalable and reliable system that enhances mobility, fosters economic opportunities, and aspires to become a leading mobility platform across multiple emerging economies.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The application features role-based dashboards, a public landing page, and supports both dark and light modes. It incorporates lazy loading, error boundaries, and loading skeletons for an optimized user experience. The UI is built to support configurable app modes (RIDER/DRIVER/UNIFIED) from a single codebase, utilizing React 18 with TypeScript, Wouter for routing, and Tailwind CSS integrated with shadcn/ui components.

### Technical Implementation
The frontend uses TanStack React Query for server state management and React hooks for local state. The backend is built with Node.js and Express.js, using TypeScript and ES modules. It follows a RESTful JSON API pattern. Authentication is handled via Replit Auth (OpenID Connect) using Passport.js, with Express sessions stored in PostgreSQL. The backend design emphasizes clean separation of concerns for routes, storage, and authentication, implementing role-based middleware for access control.

### Feature Specifications
ZIBA includes comprehensive features such as:
- **Authentication & Authorization**: Replit Auth integration and Role-Based Access Control (RBAC).
- **Multi-Role User System**: Allows a single user to hold multiple roles.
- **User & Trip Management**: Covers identity verification, fare calculation, driver payouts, and audit logging.
- **Financial Operations**: A simulated payment system with virtual wallets, dynamic country-specific pricing, and a cancellation fee system.
- **Notifications & Ratings**: In-app notifications and a mutual rating system with dispute resolution.
- **Fraud Detection**: Real-time engine with configurable signals and risk scoring.
- **Multi-Country Support**: Manages country-specific rules, taxes, and compliance.
- **Customer Support System**: Dedicated `support_agent` role and an AI-powered ZIBA Support Assistant (ZIBRA).
- **Enterprise Contracts & Billing**: Management of contracts, SLAs, and invoicing.
- **Safety & Incident Management**: SOS trigger, incident reporting, and a Safe Return Hub System.
- **Legal Compliance**: Versioned legal documents and user consent tracking.
- **Smart Onboarding**: Behavior-aware discovery, adaptive CTAs, and intent tracking.
- **Scheduled Reservations**: Advance booking functionality.
- **Tax Statement System**: Generation of PDF & CSV tax statements.
- **Universal Identity Framework**: Country-aware identity verification.
- **Director Logic System**: Manages contract/employed directors, including onboarding, lifecycle, appeals, and termination.
- **ZIBRA Coaching & Oversight**: Provides coaching for directors and drivers, and oversight signals for operational issues. Includes proactive signal engine, director performance coaching module, trust score assistance, legal safety guardrails, and voice-ready architecture (foundation, disabled by default).
- **ZIBRA Advanced Modules**: Voice-ready foundation (shared/zibra-voice.ts), proactive signal engine (shared/zibra-proactive.ts) with 16 signal types and role-aware actions, director coaching system (shared/zibra-coaching.ts) with performance summaries and guardrails, trust score assistance (shared/zibra-trust.ts) with recovery suggestions, legal safety guardrails (shared/zibra-legal-guard.ts) with keyword scanning and auto-escalation, and metrics/insights system (shared/zibra-metrics.ts). Admin ZIBRA Insights dashboard tab shows resolution rates, top topics, language stats, and system health. Auto-resolution targets: Rider 70%, Driver 60%, Director 50%. Legal guard active in chat - scans for risk keywords and redirects/escalates automatically.
- **Performance Scoring**: Implements Director Performance Scoring (DPS) and Rider Trust Score (RTS) with auto-assigned tiers and configurable incentives/restrictions.
- **Third-Party Wallet Funding**: Allows trusted users to fund a rider's wallet with defined relationship types and limits, including fraud detection and admin controls.
- **Ride Classification System**: Six ride classes (Go, Plus, Comfort, Elite, PetRide, SafeTeen) with per-class pricing (base_fare, per_km_rate, per_minute_rate, minimum_fare, surcharge), driver eligibility requirements, availability-aware selection with real-time driver counts and wait times, driver ride class preference toggles, admin class management (pricing edit, activation toggle), director class statistics dashboard, fare breakdown in trip details/receipts, ZIBRA ride class awareness templates (13 templates covering recommendations, eligibility, preferences), and edge case handling (class disabled during booking, driver eligibility mismatch, class switch mid-request). Key files: shared/ride-classes.ts (class definitions), server/fare-calculation.ts (pricing engine), client/src/components/rider/RideClassSelector.tsx (selection UI), client/src/components/admin/ride-classes-panel.tsx (admin management).
- **Reporting Dashboards**: Read-only dashboards for directors with operational metrics and comparison views for administrators.
- **Driver Preferences & Filters**: Comprehensive preference system allowing drivers to control ride matching via trip distance (short/medium/long), cash/wallet acceptance, preferred areas (soft filter, max 5), and ride class toggles. Server-side enforcement ensures admin rules always override. Abuse prevention tracks excessive declines with warning thresholds (5 declines) and temporary restrictions (10 declines = 2hr lockout). Admin can lock/unlock/reset driver preferences. Director dashboard shows over-restricting drivers. Matching priority: safety > compliance > ride class eligibility > driver preferences > proximity > performance score. ZIBRA includes 8 preference-related templates. Key files: client/src/pages/driver/preferences.tsx (driver UI), client/src/components/admin/driver-preferences-panel.tsx (admin panel), server/routes.ts (API endpoints).
- **Complete Driver Experience**: Full driver account management with profile editing (name, email, read-only phone), vehicle management (make, model, color, year, plate with edit/re-approval flow), document management (upload/replace per document with expiry warnings), data usage controls, emergency contacts, inbox, settings, help center, and terms/privacy pages.
- **Multi-Language Support (i18n)**: 12 languages (English, French, Arabic, Hausa, Igbo, Yoruba, Swahili, Zulu, Xhosa, Afrikaans, Portuguese, Spanish) with LanguageProvider context, RTL support for Arabic, and language selection pages for ALL roles: /rider/settings/language, /driver/settings/language, /director/settings/language, /admin/settings/language. Translations integrated across Rider screens (Home, Services, Activity, Inbox, Account, Settings, Payments), Driver screens (Dashboard, Account, Earnings, Wallet, Inbox, DriverLayout nav), Director dashboard (Settings tab with language), and Admin dashboard (language page with user distribution stats). Backend APIs: GET/POST /api/user/language for persistence, POST /api/user/language/detect for smart country-based detection, GET /api/admin/user-languages for admin stats. Language source tracking via `language_source` column (values: "default", "manual", "auto_country"). Smart detection on first login: francophone Africa → French, Arabic countries → Arabic, manual selection always preserved. ZIBRA sends user language with chat requests and provides role-aware language reset guidance. Safety mechanisms: English reset buttons always visible, ZIBRA auto-response for language help keywords, draggable ZIBA Support floating button.

### System Design Choices
The data storage layer uses PostgreSQL as the database, with Drizzle ORM and Zod for schema validation. The schema is comprehensive, covering all operational aspects from users and trips to financial transactions, fraud profiles, and legal compliance.

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect provider for user authentication.
- **PostgreSQL**: Primary relational database.
- **Paystack**: Payment gateway for driver payouts in Nigeria.
- **Flutterwave**: Fallback payment gateway for driver payouts in Nigeria.

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: ORM and migration tools.
- `passport` / `openid-client`: Authentication libraries.
- `express-session` / `connect-pg-simple`: Session management.
- `@tanstack/react-query`: Frontend data fetching and state management.
- `shadcn/ui`: UI component library.
- `zod`: Runtime schema validation.