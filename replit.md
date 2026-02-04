# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application designed for emerging markets, aiming to connect riders with trusted drivers for safe and reliable transportation. The platform supports seven distinct user roles to facilitate comprehensive management of operations, trip coordination, financial oversight, and customer support. The core vision is to deliver a scalable and reliable ride-hailing solution that enhances mobility and fosters economic opportunities across its operational regions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter.
- **State Management**: TanStack React Query for server state; React hooks for local state.
- **Styling**: Tailwind CSS integrated with shadcn/ui components.
- **UI/UX**: Features role-based dashboards, a public landing page, dark/light mode, eye-safe color palettes, lazy loading, error boundaries, and loading skeletons to optimize performance.
- **App Mode Separation**: Configurable APP_MODE flag (RIDER/DRIVER/UNIFIED) in `client/src/lib/app-mode.ts` enables building separate rider-only and driver-only apps from the same codebase.

### Rider App (APP_MODE=RIDER)
- **App Name**: ZIBA Ride
- **Package Name**: com.ziba.rider
- **URL**: `/` (root)
- **Features**: Rider registration, ride requests, trip tracking, wallet, ratings, support, and SOS
- **Route Guard**: RiderAppGuard enforces role restrictions - non-riders are logged out
- **Removed Routes**: All driver, admin, coordinator, and support agent routes are excluded
- **UI Copy**: Rider-focused language only, no driver/earning references

### Driver App
- **App Name**: ZIBA Driver
- **Package Name**: com.ziba.driver
- **URL**: `/driver`
- **Features**: Driver dashboard, online/offline toggle, ride requests, trip management, earnings tracking, withdrawals
- **Route Guard**: DriverAppGuard enforces role restrictions - only users with `driver` role can access
- **Pages**: dashboard, trips, earnings, profile, settings, welcome
- **UI Theme**: Emerald color scheme (emerald-600) for visual distinction from Rider App
- **Trip Flow**: Accept rides → Navigate to pickup → Start trip → Complete trip
- **Earnings**: Real-time earnings tracking, wallet balance, withdrawal management

### Admin Dashboard
- **URL**: `/admin`
- **Access**: Restricted to admin roles (super_admin, admin, finance_admin, support_agent, trip_coordinator, director)
- **Route Guard**: AdminRouter with role-based access control
- **Features**: User management, trip oversight, financial controls, approvals

### Backend
- **Runtime**: Node.js using Express.js.
- **Language**: TypeScript with ES modules.
- **API Pattern**: RESTful JSON APIs.
- **Authentication**: Replit Auth (OpenID Connect) managed via Passport.js.
- **Session Management**: Express sessions stored in PostgreSQL.
- **Design Principles**: Employs clean separation of concerns for routes, storage, and authentication, with role-based middleware for enhanced security.

### Data Storage
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM, utilizing Zod for schema validation.
- **Schema**: Comprehensive, covering users, trips, wallets, notifications, disputes, fraud profiles, incentive programs, country-specific data, support tickets, organization contracts, enterprise billing, referral codes, marketing, and feature flags.

### Core Features
- **Authentication & Authorization**: Integrates Replit Auth and implements Role-Based Access Control (RBAC).
- **User & Trip Management**: Manages the full lifecycle of users and trips, including identity verification.
- **Financial Operations**: Handles fare calculation, commission, driver payouts, a simulated payment system with virtual wallets, and detailed audit logging.
- **Notifications**: Provides in-app notifications for real-time updates and safety checks.
- **Ratings & Moderation**: Features a mutual rating system and a dispute resolution mechanism.
- **Fraud Detection**: Utilizes a real-time engine with configurable signals and risk scoring.
- **Driver Incentives**: Manages various incentive programs for drivers.
- **Trip Coordinator Module**: Allows institutional users to book and manage trips.
- **Multi-Country Support**: Manages country-specific rules, taxes, and compliance for Nigeria, United States, and South Africa.
- **Customer Support System**: Includes a dedicated `support_agent` role and ticket management.
- **Enterprise Contracts & Billing**: Manages contracts, SLAs, and invoicing for enterprise clients.
- **Monitoring & KPIs**: Aggregates performance metrics, provides alerts, and manages feature flags.
- **Growth & Marketing**: Supports referral codes and tracks marketing campaigns.
- **Scheduled Reservations**: Enables advance booking functionality.
- **Monetization System**: Implements wallet-based escrow, dynamic country-specific pricing, payment provider abstraction, and rule-based fraud detection.
- **Production Switches**: Server-side, `SUPER_ADMIN`-protected switches for country-specific payment enabling, launch modes, and explanation mode.
- **Test Mode Configuration**: Global test mode for simulated wallet payments and virtual wallets.
- **Payment Source Architecture**: `paymentSource` field (TEST_WALLET, MAIN_WALLET, CARD, BANK) resolved server-side.
- **Driver Payout Management**: Drivers manage bank/mobile money details, with manual admin processing in test mode.
- **Driver Identity & Withdrawal Verification**: Requires verified identity and country-specific documents for withdrawals, with anti-fraud safeguards.
- **Financial Engine**: Rides locked to `currencyCode`, 80% driver / 20% platform revenue split using integer-safe math and append-only ledger entries. Fare calculation uses country-specific rules.
- **Navigation Architecture**: Internal distance/duration calculations; deep links to native GPS apps for navigation.
- **Universal Identity Framework**: Country-aware identity verification for all users, enforcing ID requirements and preventing fraud through hash-based duplicate detection. Driver rules enforce identity and license verification before going online or accepting rides.
- **Nigeria Driver Withdrawal System**: Supports withdrawals to Nigerian bank accounts with strict identity verification and fraud protection, integrating Paystack and Flutterwave for automated payouts.
- **Driver GPS & Navigation Enforcement**: Mandates GPS permissions, selection of navigation providers, and background execution consent for drivers to go online. Includes spoofing detection and automatic navigation handoff via deep links.
- **Ratings, Behavior Signals & Trust Scoring**: Implements a one-time, bidirectional rating system (1-5 stars) within a 72-hour window. Captures passive behavior signals (e.g., `GPS_INTERRUPTION`, `NO_SHOW`) and positive signals. Calculates a trust score (0-100) based on ratings, behavior signals, trip completion ratio, and account age, with anti-manipulation guards.
- **Safety & Incident Intelligence**: Features an SOS trigger system for active trips, incident reporting with various types and severity levels, auto-escalation rules, and suspension management (temporary/permanent). Suspension checks prevent users from going online, accepting rides, or withdrawing funds.
- **Disputes, Refunds & Legal Resolution**: DISPUTE_ENGINE_LOCKED=true. Implements formal dispute filing within time windows (72h default, 48h Nigeria), supports dispute types (OVERCHARGE, NO_SHOW, UNSAFE_BEHAVIOR, SERVICE_QUALITY, DAMAGE, OTHER). Features refund engine with FULL_REFUND, PARTIAL_REFUND, NO_REFUND outcomes, platform absorption for settled driver payouts, chargeback tracking with auto-flagging (2+ in 90 days) and account locking (3+). Admin queue for dispute review, approval/rejection, and escalation to safety incidents. Immutable legal audit trail with dispute_audit_log.
- **Pre-Launch Compliance & Store Readiness**: COMPLIANCE_READY=true, STORE_READY=true, SOFT_LAUNCH=true, HARD_LAUNCH=false. Implements versioned legal documents (ToS, Privacy Policy, Community Guidelines, Refund Policy) accessible pre-signup. User consent tracking (location, camera, safety monitoring) with versioned logging. Kill switch system for emergency controls (GLOBAL_KILL, PAYMENT_KILL, REGISTRATION_KILL). Test mode isolation with [TEST] badges and analytics/revenue exclusion. Compliance audit logging for regulators with CSV export. Store metadata prepared for app submission.

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect provider for user authentication.
- **PostgreSQL**: The primary relational database used for data storage.
- **Paystack**: Payment gateway utilized for driver payouts in Nigeria.
- **Flutterwave**: Fallback payment gateway for driver payouts in Nigeria.

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: ORM and migration tools for PostgreSQL.
- `passport` / `openid-client`: Libraries for authentication, including OpenID Connect integration.
- `express-session` / `connect-pg-simple`: For session management with Express.js, storing sessions in PostgreSQL.
- `@tanstack/react-query`: Used for data fetching, caching, and state management in the frontend.
- `shadcn/ui`: A UI component library enhancing the frontend's visual design.
- `zod`: Employed for runtime schema validation, particularly with Drizzle ORM.