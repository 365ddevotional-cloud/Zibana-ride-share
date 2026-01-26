# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application for emerging markets, connecting riders with trusted drivers for safe and reliable transportation. It supports seven user roles (riders, drivers, administrators, directors, finance, trip coordinators, and support agents) to manage the platform, coordinate trips, track finances, and provide customer support. The project aims to offer a scalable and reliable ride-hailing solution, enhancing mobility and economic opportunities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui components
- **UI/UX**: Role-based dashboards (admin, driver, rider) and a public landing page. Supports dark/light mode with system preference detection and eye-safe color palettes. Performance is optimized with lazy loading, error boundaries, and loading skeletons.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON APIs (`/api/*`)
- **Authentication**: Replit Auth (OpenID Connect) via Passport.js
- **Session Management**: Express sessions stored in PostgreSQL
- **Design**: Clean separation of concerns (routes, storage, authentication) with role-based middleware for endpoint protection.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema**: Defined in `shared/schema.ts` for entities like `users`, `trips`, `wallets`, `notifications`, `disputes`, `fraud_risk_profiles`, `incentive_programs`, `countries`, `support_tickets`, `organization_contracts`, `service_level_agreements`, `enterprise_invoices`, `referral_codes`, `marketing_campaigns`, `partner_leads`, and `feature_flags`.

### Core Features
- **Authentication & Authorization**: Replit Auth integration with comprehensive Role-Based Access Control (RBAC) and a hierarchical `super_admin` role for governance.
- **User & Trip Management**: Full lifecycle management of users and trips, including approval, suspension, and cancellation. Includes profile photos and live camera identity verification with admin review workflow.
- **Financial Operations**: Fare calculation, commission management, driver payouts, simulated payment system with virtual wallets, and payout cycles. Includes refunds, adjustments, and chargebacks.
- **Notifications**: In-app notifications for real-time updates, ride offer alerts with 10-second countdown and sound, status notifications for all ride state changes, and safety check alerts with 4-minute idle detection.
- **Ratings & Moderation**: Mutual rating system and dispute management with admin moderation.
- **Fraud Detection**: Real-time engine with configurable signals, risk scoring, and resolution workflows.
- **Driver Incentives**: Management of various incentive programs (e.g., trip, streak, peak, quality, promo bonuses) integrated with driver wallets, with fraud prevention.
- **Trip Coordinator Module**: Functionality for institutional users to book trips, manage organization profiles, and handle support.
- **Multi-Country Support**: Management of countries, tax rules, exchange rates, and compliance profiles.
- **Customer Support System**: Dedicated `support_agent` role, ticket lifecycle management, and a messaging interface.
- **Enterprise Contracts & Billing**: Organization contract management with SLAs, multiple billing models, invoice generation, and payment tracking for institutional clients.
- **Monitoring & KPIs**: Metrics aggregation for platform, rider, driver, organization, and financial performance, with threshold alerts and feature flag management.
- **Growth & Marketing**: Referral codes, marketing campaigns, and partner lead tracking.
- **Scheduled Reservations**: Uber/Lyft-style advance booking with $5.00 reservation premium, driver assignment, 30-min prep window, early arrival bonuses (up to $10), and cancellation fees (when cancelled within 1 hour of pickup).
- **Monetization System (Phase 25)**: Wallet-based escrow flow, dynamic country-specific pricing, payment provider abstraction (Paystack/Flutterwave for Nigeria), fraud detection with rule-based abuse flagging, and comprehensive financial audit logging.

### Monetization Architecture
- **Wallet System**: Separate tables for `riderWallets`, `driverWallets`, and `zibaWallet` (platform wallet)
- **Driver Wallet**: Three-tier balance (balance, pendingBalance, withdrawableBalance) with payout cycle
- **Escrow Flow**: Funds locked when ride starts → released to driver/platform on completion → held on dispute
- **Payment Providers**: Abstracted interface supporting Paystack, Flutterwave, manual, and placeholder providers
- **Fraud Detection**: Low-cost rule-based system with configurable thresholds (excessive cancellations, reservation abuse, fake movement)
- **Country Pricing**: Dynamic pricing rules per country including base fare, per-km/minute rates, surge multipliers, and commission percentages
- **Financial Audit**: All financial events logged in `financialAuditLogs` table for compliance

## Test Mode Configuration (LOCKED)
- **GLOBAL_TEST_MODE**: Enabled - ALL countries run wallet-simulated payments
- **No Real Payments**: All charges, payouts, escrow, and commissions are simulated internally
- **Virtual Wallets**: Wallet balances are virtual and resettable
- **Full Logic Execution**: Fare, cancellation, reservation, and compensation logic runs fully
- **Audit Logging**: All transactions are logged for audit

## Security Configuration (LOCKED)
### Role-Based Access Control (RBAC)
- **Roles**: RIDER, DRIVER, ADMIN, SUPER_ADMIN
- **Admin Dashboard Access**: ONLY ADMIN or SUPER_ADMIN roles
- **No Auto-Promotion**: Users cannot gain admin access via signup, email, or country
- **Unauthorized Redirect**: Non-admin users accessing /admin/* are redirected to /unauthorized
- **Security Audit Logging**: All unauthorized access attempts are logged

### Admin Role Assignment
- **Super Admin Only**: Admin roles can ONLY be assigned by SUPER_ADMIN
- **Assignment Methods**: Role Appointments UI or direct database update
- **Session Refresh**: Changes require logout + login to take effect
- **Primary Owner**: 365ddevotional@gmail.com is permanently assigned SUPER_ADMIN

## Navigation Architecture (LOCKED)
- **NO external map SDKs** (Google Maps SDK, Mapbox, HERE, etc.)
- **NO external routing APIs** (OSRM, OpenRouteService, etc.)
- **Navigation**: Opens native GPS apps via deep links only (Google Maps on Android, Apple Maps on iOS)
- **Distance Calculation**: Internal Haversine formula from GPS coordinates
- **Duration Calculation**: Timestamp differences from GPS sampling
- **Fare Calculation**: Based on internally computed distance, time, and waiting periods

## Driver Payout Management
- **Payout Info Storage**: Bank/mobile money details stored in driverWallets table
- **APIs**: GET/PATCH `/api/driver/payout-info` for drivers to manage payout details
- **No Auto-Payouts**: All payouts require manual admin processing in test mode
- **Audit Logging**: All payout info updates are logged

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect provider for user authentication.
- **PostgreSQL**: Primary database service.

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: ORM and migration tools.
- `passport` / `openid-client`: Authentication libraries.
- `express-session` / `connect-pg-simple`: Session management.
- `@tanstack/react-query`: Data fetching and caching.
- `shadcn/ui`: UI component library.
- `zod`: Runtime schema validation.