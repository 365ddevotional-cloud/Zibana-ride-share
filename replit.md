# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application designed for emerging markets, aiming to connect riders with trusted drivers for safe and reliable transportation. It supports seven distinct user roles to manage platform operations, coordinate trips, oversee finances, and provide customer support. The project's vision is to deliver a scalable and reliable ride-hailing solution, thereby enhancing mobility and creating economic opportunities.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui components
- **UI/UX**: Role-based dashboards for administrators, drivers, and riders, alongside a public landing page. Features include dark/light mode with system preference detection and eye-safe color palettes. Performance is optimized through lazy loading, error boundaries, and loading skeletons.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON APIs (`/api/*`)
- **Authentication**: Replit Auth (OpenID Connect) via Passport.js
- **Session Management**: Express sessions stored in PostgreSQL
- **Design**: Employs a clean separation of concerns for routes, storage, and authentication, with role-based middleware securing endpoints.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod for schema validation
- **Schema**: Defined in `shared/schema.ts`, encompassing entities such as `users`, `trips`, `wallets`, `notifications`, `disputes`, `fraud_risk_profiles`, `incentive_programs`, `countries`, `support_tickets`, `organization_contracts`, `service_level_agreements`, `enterprise_invoices`, `referral_codes`, `marketing_campaigns`, `partner_leads`, and `feature_flags`.

### Core Features
- **Authentication & Authorization**: Integration with Replit Auth and comprehensive Role-Based Access Control (RBAC), including a hierarchical `super_admin` role.
- **User & Trip Management**: Full lifecycle management for users and trips, covering approval, suspension, and cancellation. Includes identity verification with live camera and admin review.
- **Financial Operations**: Fare calculation, commission management, driver payouts, a simulated payment system with virtual wallets, and payout cycles. Includes refunds, adjustments, and chargebacks.
- **Notifications**: In-app notifications for real-time updates, ride offers with countdowns, status changes, and safety checks.
- **Ratings & Moderation**: Mutual rating system and dispute resolution with admin oversight.
- **Fraud Detection**: Real-time engine with configurable signals, risk scoring, and resolution workflows.
- **Driver Incentives**: Management of various incentive programs integrated with driver wallets, with fraud prevention.
- **Trip Coordinator Module**: Functionality for institutional users to book trips and manage organizational profiles.
- **Multi-Country Support**: Management of countries, tax rules, exchange rates, and compliance profiles for Nigeria, United States, and South Africa.
- **Customer Support System**: Dedicated `support_agent` role, ticket lifecycle management, and a messaging interface.
- **Enterprise Contracts & Billing**: Management of organization contracts, SLAs, multiple billing models, invoice generation, and payment tracking.
- **Monitoring & KPIs**: Aggregation of metrics for platform, rider, driver, organization, and financial performance, with threshold alerts and feature flag management.
- **Growth & Marketing**: Referral codes, marketing campaigns, and partner lead tracking.
- **Scheduled Reservations**: Advance booking functionality with reservation premiums, driver assignment, preparation windows, early arrival bonuses, and cancellation fees.
- **Monetization System**: Wallet-based escrow flow, dynamic country-specific pricing, payment provider abstraction, rule-based fraud detection, and comprehensive financial audit logging.
- **Production Switches**: Server-side, SUPER_ADMIN-protected switches for enabling real payments per country, setting launch mode (soft/full), and an explanation mode for stakeholders. All changes are logged and instantly reversible.
- **Test Mode Configuration**: Global test mode enables simulated wallet payments, virtual wallets, and full logic execution without real monetary transactions.
- **Payment Source Architecture**: `paymentSource` field (TEST_WALLET, MAIN_WALLET, CARD, BANK) resolved server-side. Testers use `TEST_WALLET` and non-testers use `MAIN_WALLET` or `CARD`.
- **Driver Payout Management**: Drivers can manage bank/mobile money details. Payouts require manual admin processing in test mode and are logged.
- **Driver Identity & Withdrawal Verification**: Drivers require verified identity profiles and country-specific documents (e.g., DRIVER_LICENSE + NIN for Nigeria) to withdraw funds. Verification status (`pending_verification`, `verified`, `suspended`) governs withdrawal eligibility. Anti-fraud safeguards include hashing document numbers, preventing multiple accounts per document/bank, and review triggers for mismatches or rapid withdrawals. Minimum withdrawal amounts are set per country.
- **Financial Engine**: Rides are locked to a `currencyCode` based on the rider's country. Revenue split is strictly 80% driver / 20% platform, using integer-safe math and append-only ledger entries. Driver earnings are managed in separate `driverWallets`. A comprehensive audit trail is maintained for all financial transactions. Fare calculation uses country-specific rules for base, distance, time, waiting, and traffic fees, all within the ride's `currencyCode`.
- **Navigation Architecture**: No external map SDKs or routing APIs are used. Navigation relies on opening native GPS apps via deep links. Distance and duration calculations are internal, based on GPS coordinates and timestamps. Fare calculation uses internally computed distance, time, and waiting periods.

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

## Nigeria Driver Withdrawal System

### Overview
The platform supports driver withdrawals to Nigerian bank accounts with strict identity verification, currency consistency, and fraud protection.

### Supported Banks
Nigerian banks supported for withdrawals include: Access Bank, Citibank Nigeria, Ecobank Nigeria, Fidelity Bank, First Bank of Nigeria, First City Monument Bank, Guaranty Trust Bank, Heritage Bank, Keystone Bank, Polaris Bank, Stanbic IBTC Bank, Standard Chartered Bank, Sterling Bank, Union Bank of Nigeria, United Bank for Africa, Unity Bank, Wema Bank, Zenith Bank, Opay, Kuda Microfinance Bank, Moniepoint Microfinance Bank, and PalmPay.

### Withdrawal Flow
1. Driver adds bank account details (one account per driver)
2. Admin verifies bank account
3. Driver submits verification documents (NIN + Driver's License)
4. Admin verifies each document with fraud check
5. Once all verifications pass, driver can request withdrawals
6. Admin approves/rejects withdrawal requests
7. Admin marks withdrawal as paid after processing

### Verification Requirements (Nigeria)
Drivers must have ALL of the following verified before withdrawal:
- **NIN (National Identification Number)**: Verified by admin, hash stored for duplicate detection
- **Driver's License**: Verified by admin, hash stored for duplicate detection
- **Residential Address**: Must match ID documents
- **Identity Verification**: Live photo verification with admin review
- **Bank Account**: Must be verified by admin before withdrawals

### Withdrawal Rules
- **Currency**: NGN only (wallet, fare, and payout must all match)
- **Minimum Withdrawal**: ₦1,000
- **Source**: Earnings wallet only (not test wallet)
- **Eligibility**: Only fully verified drivers can withdraw
- **Test Drivers**: Cannot withdraw real funds
- **Suspended Drivers**: Blocked from withdrawals and going online

### Fraud Prevention
- **NIN Hash**: SHA-256 hash stored; blocks multiple drivers with same NIN
- **License Hash**: SHA-256 hash stored; blocks duplicate license registrations
- **Bank Account Hash**: SHA-256 hash of account number; prevents account reuse across drivers
- **One Account Rule**: Each driver can only have one bank account
- **Audit Trail**: All verifications, withdrawals, and fraud violations are logged

### Revenue Split
- **Driver Earnings**: 80% of fare
- **Platform Commission**: 20% of fare
- **Enforcement**: Server-side calculation with integer-safe math
- **Ledger**: Append-only `revenueSplitLedger` table for reconciliation

### Admin Controls
- View all driver bank accounts
- Verify/unverify bank accounts
- Verify NIN, License, Address, Identity with document numbers
- Approve/reject withdrawal requests
- Mark withdrawals as paid
- View full audit trail

### Database Tables
- `driverBankAccounts`: Bank account details with account number hash
- `driverWithdrawals`: Withdrawal requests with status tracking
- `driverProfiles`: Includes verification flags and document hashes
- `revenueSplitLedger`: Immutable record of all revenue splits

### API Endpoints
**Driver Endpoints:**
- `GET /api/driver/bank-account`: Get driver's bank account and verification status
- `POST /api/driver/bank-account`: Add bank account
- `PATCH /api/driver/bank-account`: Update bank account
- `GET /api/driver/withdrawal-eligibility`: Check withdrawal eligibility
- `GET /api/driver/withdrawals`: Get withdrawal history
- `POST /api/driver/withdrawals`: Request withdrawal

**Admin Endpoints:**
- `GET /api/admin/bank-accounts`: List all driver bank accounts
- `POST /api/admin/bank-accounts/:driverId/verify`: Verify bank account
- `POST /api/admin/drivers/:userId/verify-nin`: Verify NIN with fraud check
- `POST /api/admin/drivers/:userId/verify-license`: Verify license with fraud check
- `POST /api/admin/drivers/:userId/verify-address`: Verify address
- `POST /api/admin/drivers/:userId/verify-identity`: Verify identity
- `GET /api/admin/withdrawals`: List all withdrawal requests
- `POST /api/admin/withdrawals/:id/approve`: Approve withdrawal
- `POST /api/admin/withdrawals/:id/reject`: Reject withdrawal
- `POST /api/admin/withdrawals/:id/paid`: Mark withdrawal as paid