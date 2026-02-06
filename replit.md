# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application for emerging markets, connecting riders with drivers for safe and reliable transportation. It supports seven user roles to manage operations, trip coordination, financial oversight, and customer support. The platform aims to be a scalable, reliable ride-hailing solution that improves mobility and creates economic opportunities in its operational regions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for server state; React hooks for local state.
- **Styling**: Tailwind CSS integrated with shadcn/ui components.
- **UI/UX**: Role-based dashboards, public landing page, dark/light mode, lazy loading, error boundaries, and loading skeletons.
- **App Mode Separation**: Configurable `APP_MODE` (RIDER/DRIVER/UNIFIED) to build separate rider-only or driver-only apps from a single codebase.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Pattern**: RESTful JSON APIs.
- **Authentication**: Replit Auth (OpenID Connect) via Passport.js.
- **Session Management**: Express sessions stored in PostgreSQL.
- **Design Principles**: Clean separation of concerns for routes, storage, and authentication, with role-based middleware.

### Data Storage
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM with Zod for schema validation.
- **Schema**: Covers users, trips, wallets, notifications, disputes, fraud profiles, incentive programs, country-specific data, support tickets, organization contracts, enterprise billing, referral codes, marketing, and feature flags.

### Core Features
- **Authentication & Authorization**: Replit Auth integration and Role-Based Access Control (RBAC).
- **Multi-Role User System**: Supports a single user having multiple distinct roles.
- **User & Trip Management**: Full lifecycle management of users and trips, including identity verification.
- **Financial Operations**: Fare calculation, commission, driver payouts, simulated payment system with virtual wallets, and audit logging.
- **Notifications**: In-app notifications for real-time updates.
- **Ratings & Moderation**: Mutual rating system and dispute resolution.
- **Fraud Detection**: Real-time engine with configurable signals and risk scoring.
- **Driver Incentives**: Management of various incentive programs.
- **Trip Coordinator Module**: For institutional users to book and manage trips.
- **Multi-Country Support**: Manages country-specific rules, taxes, and compliance for various regions (e.g., Nigeria, USA). Includes multi-country launch control and per-country system modes.
- **Customer Support System**: Dedicated `support_agent` role and ticket management.
- **Enterprise Contracts & Billing**: Management of contracts, SLAs, and invoicing.
- **Monitoring & KPIs**: Aggregation of performance metrics, alerts, and feature flag management.
- **Growth & Marketing**: Referral codes and marketing campaign tracking.
- **Scheduled Reservations**: Advance booking functionality.
- **Monetization System**: Wallet-based escrow, dynamic country-specific pricing, payment provider abstraction, and rule-based fraud detection.
- **Production Switches**: Server-side, `SUPER_ADMIN`-protected switches for country-specific features.
- **Test Mode Configuration**: Global test mode for simulated payments.
- **Driver Payout Management**: Drivers manage bank/mobile money details, with admin processing.
- **Tax Statement Mileage Disclosure**: Annual tax statements include total miles driven while online, aggregated per tax year. Mileage auto-accumulates from completed trips and is auditable via `driver_mileage_logs` table. Mileage shown only on annual tax statements and downloadable documents — never in daily trip views or earnings screens. Presentation is factual and neutral per TAX_PHILOSOPHY_LOCKED.
- **Driver Identity & Withdrawal Verification**: Requires verified identity and country-specific documents for withdrawals.
- **Financial Engine**: Rides locked to `currencyCode`, 80% driver / 20% platform revenue split using integer-safe math and append-only ledger entries.
- **Navigation Architecture**: Internal distance/duration calculations; deep links to native GPS apps.
- **Universal Identity Framework**: Country-aware identity verification for all users.
- **Driver GPS & Navigation Enforcement**: Mandates GPS permissions and background execution consent for drivers.
- **Ratings, Behavior Signals & Trust Scoring**: Bidirectional rating system, capture of passive behavior signals, and trust score calculation with anti-manipulation guards.
- **Safety & Incident Intelligence**: SOS trigger system, incident reporting, auto-escalation rules, and suspension management.
- **Disputes, Refunds & Legal Resolution**: Formal dispute filing, refund engine, chargeback tracking, and immutable audit trail.
- **Pre-Launch Compliance & Store Readiness**: Versioned legal documents, user consent tracking, kill switch system, and test mode isolation.
- **Admin Override Control & Support Safety**: Authorized admin/super_admin users can perform controlled overrides with audit logging.
- **New vs Returning User Analytics**: Tracks growth, retention, and platform health.
- **Driver Acquisition Automation**: Structured driver supply growth with multiple channels and onboarding stages.
- **In-App Q&A & Help Center**: Full-featured help center with FAQ system for all user roles.
- **Rider & Driver Trust, Safety & Incident Management**: Full safety UI layer for SOS, incident reporting, trusted contacts, and trip sharing.
- **Growth, Marketing & Virality Systems (Phase 11A)**: Sustainable growth loops with rider referral rewards (reward after first ride completion), shareable moments (celebratory prompts at first ride, milestone earnings, high ratings), enhanced campaign engine (target audience, country/subregion, incentive rules, redemption tracking), reactivation automation rules (configurable inactive thresholds with gentle reminders), marketing attribution tracking (REFERRAL, CAMPAIGN, ORGANIC, ADMIN_INVITE sources), and growth safety controls (admin toggles for virality, share moments, reactivation; referral reward caps; per-country overrides). Admin Growth tab enhanced with campaign details, reactivation rules management, attribution stats, and safety controls panel.
- **Driver Hub Structure**: Restructured driver app with 5-tab bottom navigation (Home, Trips, Earnings, Wallet, Help). Home tab shows driver photo, trust score gauge, tier badge, online/offline toggle, today's summary, welcome-back greeting, and system messages. Trips tab with detail modal showing fare breakdown and report functionality. Earnings tab with Today/Week/30-Day periods, acceptance/cancellation rates, and supportive insight messages. Wallet tab with available/pending balances, transaction history, platform fee visibility, and bank account management. Help tab with categorized help cards (Getting Paid, Trips & Ratings, Safety, App Usage, Incentives) and Safety Center with SOS button and incident reporting. Behavior advisory system shows encouraging messages when driver performance dips. Admin overrides for trust score, cancellation metrics, disputes, and pairing blocks. Driver analytics endpoint tracking new/returning drivers, daily active, tip frequency, and incentive effectiveness.

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