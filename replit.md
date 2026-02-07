# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application designed for emerging markets, connecting riders with drivers for safe and reliable transportation. It supports seven distinct user roles to manage various aspects of operations, trip coordination, financial oversight, and customer support. The platform aims to be a scalable and reliable solution, enhancing mobility and fostering economic opportunities in its operational regions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for server state; React hooks for local state.
- **Styling**: Tailwind CSS with shadcn/ui components.
- **UI/UX**: Features role-based dashboards, a public landing page, dark/light mode, lazy loading, error boundaries, and loading skeletons. Supports configurable app modes (RIDER/DRIVER/UNIFIED) from a single codebase.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Pattern**: RESTful JSON APIs.
- **Authentication**: Replit Auth (OpenID Connect) via Passport.js.
- **Session Management**: Express sessions stored in PostgreSQL.
- **Design Principles**: Emphasizes clean separation of concerns for routes, storage, and authentication, with role-based middleware.

### Data Storage
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM with Zod for schema validation.
- **Schema**: Comprehensive, covering users, trips, wallets, notifications, disputes, fraud profiles, incentive programs, country-specific data, support tickets, organization contracts, enterprise billing, referral codes, marketing, and feature flags.

### Core Features
- **Authentication & Authorization**: Replit Auth integration and Role-Based Access Control (RBAC).
- **Multi-Role User System**: Allows a single user to possess multiple roles.
- **User & Trip Management**: Full lifecycle management of users and trips, including identity verification.
- **Financial Operations**: Includes fare calculation, commission, driver payouts, simulated payment system with virtual wallets, and audit logging. Supports wallet-based escrow, dynamic country-specific pricing, and payment provider abstraction.
- **Notifications & Ratings**: In-app notifications and a mutual rating system with dispute resolution.
- **Fraud Detection**: Real-time engine with configurable signals and risk scoring.
- **Driver Incentives**: Management of various incentive programs.
- **Trip Coordinator Module**: For institutional users to book and manage trips.
- **Multi-Country Support**: Manages country-specific rules, taxes, and compliance, including multi-country launch control and per-country system modes.
- **Customer Support System**: Dedicated `support_agent` role and ticket management.
- **Enterprise Contracts & Billing**: Management of contracts, SLAs, and invoicing.
- **Monitoring & KPIs**: Aggregation of performance metrics, alerts, and feature flag management.
- **Growth & Marketing**: Referral codes and marketing campaign tracking.
- **Scheduled Reservations**: Advance booking functionality.
- **Production Switches**: Server-side, `SUPER_ADMIN`-protected switches for country-specific features.
- **Test Mode Configuration**: Global test mode for simulated payments.
- **Driver Payout Management**: Drivers manage bank/mobile money details, with admin processing.
- **Tax Statement System**: Comprehensive tax statement generation (PDF & CSV) including DriverTaxProfile, DriverTaxYearSummary, DriverTaxDocument, and TaxGenerationAuditLog. Features country-specific tax compliance configurations.
- **Driver Identity & Withdrawal Verification**: Requires verified identity and country-specific documents for withdrawals.
- **Cash & Card Payment System**: Riders can pay via Cash, Wallet, or Card, with a period-based settlement ledger for cash trips and anti-abuse controls.
- **Navigation Architecture**: Internal distance/duration calculations; deep links to native GPS apps.
- **Universal Identity Framework**: Country-aware identity verification.
- **Driver GPS & Navigation Enforcement**: Mandates GPS permissions and background execution consent.
- **Ratings, Behavior Signals & Trust Scoring**: Bidirectional rating system, passive behavior signal capture, and trust score calculation with anti-manipulation guards.
- **Safety & Incident Intelligence**: SOS trigger system, incident reporting, auto-escalation rules, and suspension management.
- **Disputes, Refunds & Legal Resolution**: Formal dispute filing, refund engine, chargeback tracking, and immutable audit trail.
- **Pre-Launch Compliance & Store Readiness**: Versioned legal documents, user consent tracking, kill switch system, and test mode isolation.
- **Admin Override Control & Support Safety**: Authorized admin/super_admin users can perform controlled overrides with audit logging.
- **New vs Returning User Analytics**: Tracks growth, retention, and platform health.
- **Driver Acquisition Automation**: Structured driver supply growth with multiple channels and onboarding stages.
- **In-App Q&A & Help Center**: Full-featured help center with FAQ system for all user roles.
- **Rider & Driver Trust, Safety & Incident Management**: Full safety UI layer for SOS, incident reporting, trusted contacts, and trip sharing.
- **Growth, Marketing & Virality Systems**: Includes rider referral rewards, shareable moments, enhanced campaign engine, reactivation automation rules, marketing attribution tracking, and growth safety controls.
- **Cancellation Fee System**: Configurable cancellation fees deducted from rider wallet, with grace periods and audit logs.
- **Saved Places (Home/Work)**: Riders can save and manage Home and Work addresses.
- **Rider Inbox System**: In-app message inbox for riders with various message types.
- **Notification Preferences**: Per-user notification toggles.
- **Marketing Tip Banner**: Rate-limited, dismissible marketing tips on the rider home page.
- **Wallet Auto Top-Up**: Riders can configure automatic wallet funding when the balance drops below a threshold.
- **Support Ticket Wallet Context**: Support ticket details are enriched with wallet information for agents.
- **Driver Hub Structure**: Restructured driver app with 5-tab bottom navigation (Home, Trips, Earnings, Wallet, Help), including performance insights, admin override capabilities, and header theme toggle.
- **Rider App Structure**: Restructured rider app with 5-tab bottom navigation (Home, Services, Activity, Inbox, Account). Services page has scheduled rides, corporate rides, and special rides. Activity page has tabbed trip history, cancellations, and penalties. Account page has structured settings sections for Communication (notifications, marketing), Appearance (Light/Dark/System theme), Privacy, Safety, and Support.

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect provider for user authentication.
- **PostgreSQL**: Primary relational database.
- **Paystack**: Payment gateway for driver payouts in Nigeria.
- **Flutterwave**: Fallback payment gateway for driver payouts in Nigeria.
- **Simulation Center**: System-level simulation mode for testing, controlled by environment variables.

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: ORM and migration tools.
- `passport` / `openid-client`: Authentication libraries.
- `express-session` / `connect-pg-simple`: Session management.
- `@tanstack/react-query`: Frontend data fetching and state management.
- `shadcn/ui`: UI component library.
- `zod`: Runtime schema validation.