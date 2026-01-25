# ZIBA - Ride Hailing Platform

## Overview

ZIBA is a ride-hailing web application for emerging markets, connecting riders with trusted drivers for safe and reliable transportation. It supports three primary user roles: riders, drivers, and administrators, with additional roles for directors, finance, and trip coordinators for enhanced platform management. The platform aims to provide a robust, scalable solution for ride-hailing operations, including comprehensive trip management, financial tracking, and moderation capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite
- **Theme Support**: Dark/light mode with system preference detection
- **UI/UX**: Role-based routing directs authenticated users to specific dashboards (admin, driver, rider), while unauthenticated users access a public landing page.

### Backend

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON APIs under `/api/*`
- **Authentication**: Replit Auth (OpenID Connect) via Passport.js
- **Session Management**: Express sessions stored in PostgreSQL
- **Design**: Clean separation between routes, storage layer, and authentication, utilizing role-based middleware for endpoint protection.

### Data Storage

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema**: Defined in `shared/schema.ts`
- **Migrations**: Managed via `drizzle-kit push`
- **Key Tables**: `users`, `sessions`, `user_roles`, `driver_profiles`, `rider_profiles`, `trip_coordinator_profiles`, `trips`, `notifications`, `ratings`, `disputes`, `refunds`, `chargebacks`, `wallets`, `wallet_transactions`, `wallet_payouts`, `audit_logs`, `fraud_risk_profiles`, `fraud_events`, `incentive_programs`, `incentive_earnings`, `countries`, `tax_rules`, `exchange_rates`, `compliance_profiles`.

### Core Features

- **Authentication**: Replit Auth integration with role selection post-authentication.
- **User Management**: Comprehensive administration of drivers (approval, suspension), riders, and trips.
- **Trip Management**: Full lifecycle tracking from request to completion, including cancellation with reasons.
- **Financials**: Fare calculation (base + per-passenger), ZIBA commission, driver payouts, and a simulated payment system with virtual wallets and payout cycles.
- **Notifications**: In-app notifications with real-time updates for critical events.
- **Ratings & Reviews**: Mutual rating system for riders and drivers with average rating calculations.
- **Disputes & Moderation**: System for raising and managing disputes with admin moderation.
- **Refunds & Adjustments**: Role-based approval workflows for refunds and wallet adjustments with audit trails.
- **Chargebacks & Reconciliation**: Tracking chargebacks and facilitating external payment reconciliation.
- **Role-Based Access Control**: Granular permissions across various user roles (Admin, Driver, Rider, Director, Finance, Trip Coordinator).

## External Dependencies

### Third-Party Services

- **Replit Auth**: OpenID Connect provider for user authentication.
- **PostgreSQL**: Database service (requires `DATABASE_URL` environment variable).

### Key NPM Packages

- `drizzle-orm` / `drizzle-kit`: ORM and migration tools.
- `passport` / `openid-client`: Authentication libraries.
- `express-session` / `connect-pg-simple`: Session management.
- `@tanstack/react-query`: Data fetching and caching.
- `shadcn/ui`: UI component library.
- `zod`: Runtime schema validation.

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_SECRET`: Secret for session cookies.
- `ISSUER_URL`: OpenID Connect issuer.
- `REPL_ID`: Replit environment identifier.

## Recent Changes

### Phase 11 – Earnings Wallets & Payout Cycles (January 2026)
- Created `wallets`, `wallet_transactions`, and `wallet_payouts` tables for comprehensive earnings tracking
- Wallet operations: credit (trip earnings), debit (payouts), hold (pending payouts), release (failed payouts)
- Payout cycle workflow: pending → processing → paid/failed/reversed
- Role-based permissions: Finance/Admin can manage payouts, Drivers view their own wallet
- Trip completion automatically credits driver wallet with payout amount
- Admin dashboard Wallets tab with payout management interface
- Driver dashboard Earnings Wallet section showing balance, transactions, and payout history

### Phase 12 – Admin Financial Analytics & Reports (January 2026)
- Real-time financial analytics for Admin and Finance roles
- Aggregated metrics: trips (total/completed/cancelled), revenue (gross/commission/driver earnings), refunds, chargebacks, wallets, payouts
- Time range filtering: Today, 7d, 30d, 90d, All Time
- Admin dashboard Reports tab with:
  - Financial overview cards (trips, revenue, commission, driver earnings)
  - Refunds, chargebacks, and wallet payout summaries
  - Driver wallet balance overview (total, available, locked)
  - Revenue over time table
  - CSV export functionality for all report types
- API endpoints:
  - GET /api/analytics/overview - Aggregated financial overview
  - GET /api/analytics/trips - Trip analytics by date
  - GET /api/analytics/revenue - Revenue analytics by date
  - GET /api/analytics/refunds - Refund analytics by date
  - GET /api/analytics/payouts - Payout analytics by date
  - GET /api/analytics/reconciliation - Payment reconciliation stats
  - GET /api/reports/export - CSV export endpoint
- Role-based access: Admin/Finance only (Directors excluded)
- Read-only analytics - no data mutation

### Phase 13 – Fraud Detection & Risk Scoring (January 2026)
- Created `fraud_risk_profiles` and `fraud_events` tables for comprehensive fraud tracking
- Real-time fraud detection engine with configurable signal weights
- Signal types: rapid_cancellations, suspicious_locations, unusual_fare_patterns, multiple_accounts, payment_anomalies
- Risk levels: low (0-20), medium (21-50), high (51-80), critical (81-100)
- Automatic fraud event detection with severity scoring
- Admin dashboard Fraud tab with:
  - Risk overview metrics (total profiles, distribution by risk level)
  - Active fraud events with resolution workflow
  - Driver risk profiles table with scores and levels
  - Manual fraud evaluation trigger
- API endpoints:
  - GET /api/fraud/overview - Fraud overview statistics
  - GET /api/fraud/events - Active fraud events list
  - GET /api/fraud/profiles - Risk profiles for all entities
  - POST /api/fraud/evaluate - Trigger system-wide fraud evaluation
  - POST /api/fraud/resolve/:eventId - Resolve fraud events
- Role-based access: Admin/Finance only

### Phase 14 – Driver Incentives System (January 2026)
- Created `incentive_programs` and `incentive_earnings` tables
- Five incentive types: trip (complete X trips), streak (X consecutive days), peak (during peak hours), quality (rating bonuses), promo (promotional campaigns)
- Incentive evaluation engine with criteria-based JSON configuration
- Fraud integration: Drivers with high/critical risk or unresolved fraud events cannot earn incentives
- Earning workflow: pending → approved → paid (with revocation capability)
- Wallet integration: Incentive payments automatically credited to driver wallets with "incentive" source
- Admin dashboard Incentives tab with:
  - Program statistics (active programs, pending/paid/revoked earnings)
  - Program management (create, pause, end programs)
  - Driver earnings table with approval and revocation workflow
  - System-wide incentive evaluation trigger
- Driver dashboard Incentive Bonuses section showing:
  - Total earnings from incentives
  - Pending bonus count
  - Recent bonus history with status
- API endpoints:
  - GET /api/incentives/stats - Incentive program statistics
  - GET /api/incentives/programs - All programs list
  - GET /api/incentives/earnings - All earnings (Admin/Finance)
  - GET /api/incentives/earnings/mine - Driver's own earnings
  - POST /api/incentives/create - Create new program (Admin only)
  - POST /api/incentives/pause/:id - Pause program
  - POST /api/incentives/end/:id - End program
  - POST /api/incentives/evaluate - System-wide evaluation
  - POST /api/incentives/approve/:id - Approve and pay earning
  - POST /api/incentives/revoke/:id - Revoke earning with reason
- Role-based access: Admin/Finance only (Directors/Trip Coordinators excluded from management)

### Phase 14.5 – Trip Coordinator Module (January 2026)
- Created `trip_coordinator_profiles` table for institutional rider support
- Extended trips table with third-party booking fields:
  - `bookedForType`: enum ("self", "third_party") - indicates booking type
  - `passengerName`: Name of actual passenger (required for third-party bookings)
  - `passengerContact`: Optional contact number for passenger
  - `notesForDriver`: Special instructions for driver
- Organization types: ngo, hospital, church, school, gov, corporate, other
- Billing mode: Simulated payment for all coordinator bookings
- Trip Coordinator dashboard with:
  - Organization profile setup (name, type, contact email, phone)
  - Trip booking form for beneficiaries with passenger details
  - Organization trip history with filtering
  - Statistics overview (total trips, completed, active, charges)
  - Receipt viewing for completed trips
  - Dispute submission for trip issues
  - Driver rating system
  - Trip cancellation capability
- Storage layer methods:
  - createTripCoordinatorProfile / getTripCoordinatorProfile
  - getCoordinatorTrips (with status/date filtering)
  - getCoordinatorTripStats
- API endpoints:
  - GET /api/coordinator/profile - Get coordinator profile
  - POST /api/coordinator/profile - Create organization profile
  - GET /api/coordinator/trips - List coordinator trips
  - GET /api/coordinator/stats - Trip statistics
  - POST /api/coordinator/trips - Book trip for beneficiary
  - GET /api/coordinator/receipts/:tripId - Get trip receipt
  - POST /api/coordinator/disputes - Submit dispute
  - GET /api/coordinator/disputes - List disputes
  - POST /api/coordinator/ratings - Rate driver
  - POST /api/coordinator/trips/:tripId/cancel - Cancel trip
- Role-based access: trip_coordinator role only
- Coordinators treated as riders for dispute purposes (raisedByRole: "rider")

### Phase 15 – Multi-Country Tax, Currency & Compliance (January 2026)
- Created `countries`, `tax_rules`, `exchange_rates`, and `compliance_profiles` tables
- Extended trips table with multi-country support:
  - `countryId`: Reference to operating country
  - `currency`: Currency code for the trip (3-char ISO)
  - `estimatedTaxAmount`: Calculated tax amount for compliance tracking
- Country configuration:
  - Name, ISO code (2-3 char), default currency, timezone
  - Active/inactive status for operational control
- Tax rules system:
  - Tax types: VAT, SALES, SERVICE, OTHER
  - Applies to: FARE, COMMISSION, or BOTH
  - Effective date ranges for rate changes
- Exchange rates:
  - Manual rate entry (simulation)
  - Base/target currency pairs
  - Historical rate tracking
- Compliance profiles:
  - Legal entity information per country
  - Registration and tax IDs
  - Notes for compliance tracking
- Admin dashboard Countries tab with:
  - Compliance overview metrics (total/active countries, tax rules, estimated tax)
  - Sub-tabs for Countries, Tax Rules, Exchange Rates
  - Country management (create, activate/deactivate)
  - Tax rule creation with country selection
  - Exchange rate entry
- Storage layer methods:
  - createCountry / getCountryById / getCountryByCode / getAllCountries / getActiveCountries / updateCountry
  - createTaxRule / getTaxRuleById / getTaxRulesByCountry / getActiveTaxRules / getAllTaxRules / updateTaxRule
  - createExchangeRate / getLatestExchangeRate / getAllExchangeRates / getExchangeRateHistory
  - createComplianceProfile / getComplianceProfileByCountry / getAllComplianceProfiles / updateComplianceProfile
  - getCountryAnalytics / getComplianceOverview
- API endpoints:
  - GET /api/countries - List all countries with details
  - GET /api/countries/active - List active countries
  - POST /api/countries - Create new country (Admin only)
  - PATCH /api/countries/:countryId - Update country
  - GET /api/tax-rules - List all tax rules
  - POST /api/tax-rules - Create tax rule (Admin only)
  - PATCH /api/tax-rules/:ruleId - Update tax rule
  - GET /api/exchange-rates - List all exchange rates
  - GET /api/exchange-rates/latest - Get latest rate for currency pair
  - POST /api/exchange-rates - Create exchange rate (Admin/Finance)
  - GET /api/compliance - List all compliance profiles
  - POST /api/compliance - Create compliance profile (Admin only)
  - PATCH /api/compliance/:profileId - Update compliance profile
  - GET /api/analytics/countries - Country analytics
  - GET /api/compliance/overview - Compliance overview stats
- Role-based access: Admin/Finance only (Directors/Trip Coordinators excluded)