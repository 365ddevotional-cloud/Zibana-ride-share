# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application for emerging markets, connecting riders with trusted drivers for safe and reliable transportation. It supports seven distinct user roles to manage operations, coordinate trips, oversee finances, and provide customer support. The project aims to deliver a scalable and reliable ride-hailing solution, enhancing mobility and creating economic opportunities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui components
- **UI/UX**: Role-based dashboards, public landing page, dark/light mode, eye-safe color palettes, lazy loading, error boundaries, and loading skeletons for performance optimization.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON APIs (`/api/*`)
- **Authentication**: Replit Auth (OpenID Connect) via Passport.js
- **Session Management**: Express sessions stored in PostgreSQL
- **Design**: Clean separation of concerns for routes, storage, and authentication, with role-based middleware for security.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod for schema validation
- **Schema**: Comprehensive schema covering users, trips, wallets, notifications, disputes, fraud profiles, incentive programs, country-specific data, support tickets, organization contracts, enterprise billing, referral codes, marketing, and feature flags.

### Core Features
- **Authentication & Authorization**: Replit Auth integration and Role-Based Access Control (RBAC).
- **User & Trip Management**: Full lifecycle management including identity verification.
- **Financial Operations**: Fare calculation, commission, driver payouts, simulated payment system with virtual wallets, and audit logging.
- **Notifications**: In-app notifications for real-time updates and safety checks.
- **Ratings & Moderation**: Mutual rating system and dispute resolution.
- **Fraud Detection**: Real-time engine with configurable signals and risk scoring.
- **Driver Incentives**: Management of incentive programs.
- **Trip Coordinator Module**: For institutional users to book and manage trips.
- **Multi-Country Support**: Management of country-specific rules, taxes, and compliance for Nigeria, United States, and South Africa.
- **Customer Support System**: Dedicated `support_agent` role and ticket management.
- **Enterprise Contracts & Billing**: Management of contracts, SLAs, and invoicing.
- **Monitoring & KPIs**: Aggregation of performance metrics with alerts and feature flag management.
- **Growth & Marketing**: Referral codes and marketing campaign tracking.
- **Scheduled Reservations**: Advance booking functionality.
- **Monetization System**: Wallet-based escrow, dynamic country-specific pricing, payment provider abstraction, and rule-based fraud detection.
- **Production Switches**: Server-side, `SUPER_ADMIN`-protected switches for country-specific payment enabling, launch modes, and explanation mode.
- **Test Mode Configuration**: Global test mode for simulated wallet payments and virtual wallets.
- **Payment Source Architecture**: `paymentSource` field (TEST_WALLET, MAIN_WALLET, CARD, BANK) resolved server-side.
- **Driver Payout Management**: Drivers manage bank/mobile money details, with manual admin processing in test mode.
- **Driver Identity & Withdrawal Verification**: Requires verified identity and country-specific documents for withdrawals, with anti-fraud safeguards.
- **Financial Engine**: Rides locked to `currencyCode`, 80% driver / 20% platform revenue split using integer-safe math and append-only ledger entries. Fare calculation uses country-specific rules.
- **Navigation Architecture**: Internal distance/duration calculations; deep links to native GPS apps for navigation.
- **Universal Identity Framework**: Country-aware identity verification for all users, enforcing ID requirements and preventing fraud through hash-based duplicate detection. Driver rules enforce identity and license verification before going online or accepting rides.

### Nigeria Driver Withdrawal System
- Supports withdrawals to Nigerian bank accounts with strict identity verification and fraud protection.
- Integration with Paystack (primary) and Flutterwave (fallback) for automated payouts, with manual mode as default.
- Robust workflow including admin verification of bank accounts and identity documents (NIN, Driver's License).
- Fraud prevention through hashing document and bank account numbers to prevent duplicates.
- Strict revenue split (80% driver / 20% platform) enforced server-side.

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect provider.
- **PostgreSQL**: Primary database.
- **Paystack**: Payment gateway for Nigeria payouts.
- **Flutterwave**: Payment gateway for Nigeria payouts (fallback).

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: ORM and migration tools.
- `passport` / `openid-client`: Authentication libraries.
- `express-session` / `connect-pg-simple`: Session management.
- `@tanstack/react-query`: Data fetching and caching.
- `shadcn/ui`: UI component library.
- `zod`: Runtime schema validation.