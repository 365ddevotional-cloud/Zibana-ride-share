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
- **Key Tables**: `users`, `sessions`, `user_roles`, `driver_profiles`, `rider_profiles`, `trips`, `notifications`, `ratings`, `disputes`, `refunds`, `chargebacks`, `wallets`, `wallet_transactions`, `wallet_payouts`, `audit_logs`.

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