# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application designed for emerging markets, connecting riders with drivers for safe and reliable transportation. It supports seven distinct user roles to manage various aspects of operations, trip coordination, financial oversight, and customer support. The platform aims to be a scalable and reliable solution, enhancing mobility and fostering economic opportunities in its operational regions. The project envisions a future where ZIBA is a leading mobility platform across multiple emerging economies, known for its reliability, safety, and positive socio-economic impact.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for client-side navigation.
- **State Management**: TanStack React Query for server state; React hooks for local state.
- **Styling**: Tailwind CSS integrated with shadcn/ui components.
- **UI/UX**: Features include role-based dashboards, a public landing page, dark/light mode, lazy loading, error boundaries, loading skeletons, and configurable app modes (RIDER/DRIVER/UNIFIED) from a single codebase.

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
- **Multi-Role User System**: A single user can possess multiple roles (e.g., rider and driver).
- **User & Trip Management**: Full lifecycle management including identity verification, fare calculation, driver payouts, and audit logging.
- **Financial Operations**: Simulated payment system with virtual wallets, dynamic country-specific pricing, payment provider abstraction, and a cancellation fee system.
- **Notifications & Ratings**: In-app notifications and a mutual rating system with dispute resolution.
- **Fraud Detection**: Real-time engine with configurable signals and risk scoring.
- **Driver Incentives**: Management of various incentive programs.
- **Multi-Country Support**: Manages country-specific rules, taxes, compliance, and launch control.
- **Customer Support System**: Dedicated `support_agent` role, ticket management, and an AI-powered ZIBA Support Assistant (ZIBRA) with context-sensitive responses, escalation, and governance controls.
- **Enterprise Contracts & Billing**: Management of contracts, SLAs, and invoicing.
- **Safety & Incident Management**: SOS trigger, incident reporting, auto-escalation, suspension management, Accident Report Protocol, Lost Item Protocol with AI fraud detection, and a Safe Return Hub System.
- **Legal Compliance**: Versioned legal documents, user consent tracking, legal acknowledgement logging, and country-specific legal localization.
- **Growth & Marketing**: Referral codes, marketing campaign tracking, and in-app tip banners.
- **Scheduled Reservations**: Advance booking functionality.
- **Driver and Rider Apps**: Restructured interfaces with bottom navigation, performance insights, and comprehensive settings.
- **Tax Statement System**: Generation of PDF & CSV tax statements with country-specific configurations.
- **Universal Identity Framework**: Country-aware identity verification for drivers and riders.
- **Driver Training Module**: Interactive training for key protocols.
- **Driver Accident Relief Fund**: Financial support for drivers involved in verified accidents.
- **Director Logic System**: Comprehensive contract/employed director management with daily commission eligibility (77% active ratio, 1000 commissionable cap, 1300 cell cap), cell management, driver suspend/activate authority (contract only), ZIBRA director mode (23 templates), and Super Admin director settings panel with immutable audit logging. Includes director onboarding wizard (5-step flows for contract/employed types), lifecycle management (pending/active/suspended/terminated), appeals system with admin review, ZIBRA de-escalation templates, and termination safety with automatic driver reassignment. Validated with 440 automated tests across 6 phases.
- **Contract Director Lifespan**: Admin-controlled lifespan start/end dates for contract directors with auto-suspension on expiry, commission freezing, driver cell locking, and ZIBRA expiry notifications (14/7/1 day warnings).
- **Multi-Cell Support**: Up to 3 driver cells per contract director, each with max 1300 drivers and 1000 commissionable cap. Per-cell metrics dashboard showing counts only (no financial data).
- **Director Dashboard (Private)**: Dedicated director dashboard with `/director/*` routing (dashboard, drivers, funding, staff, activity) and URL-based tab synchronization. Shows profile overview, lifespan countdown, cell tabs with per-cell metrics, staff list, coaching alerts with "Contact Human Support" escalation, ZIBA Support Insight Card with performance feedback, "Funding Given (Month)" KPI, empty state for <10 drivers, and action logs. Accessible to director, admin, and super_admin only. Directors redirect to `/director/dashboard` on login.
- **Director Staff & Team Roles**: Contract directors can create staff accounts with scoped section-level access. Staff roles require admin approval before activation. Directors can manage staff with admin permission.
- **Director Audit & Accountability**: Enhanced action logging capturing actorId, role, action, target, timestamp, before/after state, and IP address for all director governance actions. `ipAddress` field on both `directorActionLogs` and `auditLogs` tables. Logs visible to admin and super_admin only.
- **Director Lifecycle Management**: Extended `directorProfiles` with `maxCells`, `createdBy`, `lastModifiedBy`, `lastModifiedAt`, `commissionRatePercent`, `maxCommissionablePerDay`, `approvedBy` fields. Endpoints for terminate (super_admin only), GET lifecycle detail (admin), enhanced suspend/reactivate with audit logging and IP capture. Admin lifecycle detail dialog with lifespan controls, status transitions, and recent activity.
- **Director Appointment System**: Super Admin appointment flow with available-users search, director type selection (contract/employed), lifespan dates, cell limits, and commission rate configuration. Contract directors get auto-generated referral codes (DIR-XXXXXX format). Activation requires 10 recruited drivers for contract directors. Endpoints: `POST /api/admin/directors/appoint`, `GET /api/admin/directors/available-users`, `POST /api/admin/directors/:id/activate`, `POST /api/admin/directors/:id/adjust-commission`, `POST /api/admin/directors/:id/adjust-cells`. Full admin UI with Appoint Director dialog, enhanced directors table with lifecycle status/cells/dates columns, and action confirmation modals requiring reason inputs for all governance actions.
- **Director Payout Summaries & Controls**: `directorPayoutSummaries` table tracking payout cycles with status (pending/released/on_hold), fraud flags, admin notes, and cap enforcement. Director Earnings tab (`/director/earnings`) showing masked view (active drivers, commissionable drivers, eligible drivers, estimated earnings, payout status) with NO commission math exposed. Admin full earnings view in lifecycle dialog showing commission rate, active ratio, per-day metrics, earnings history with cap/fraud flags, and Super Admin payout controls (create/release/hold). Legal safety disclaimer displayed. Endpoints: `GET /api/director/earnings`, `GET /api/admin/directors/:id/earnings`, `POST /api/admin/directors/:id/payout`.
- **Director Analytics API**: Safe read-only endpoint (`GET /api/director/analytics`) exposing driver counts, active drivers, commissionable count, weekly growth trends, funding counts (no amounts), trust scores, cell health badges, and activity ratios. Does NOT expose commission percentages, platform revenue, or per-driver earnings.
- **ZIBRA Oversight Watch Signals**: Endpoint (`GET /api/director/oversight-signals`) detecting contract expiry (3 severity levels: warning at 14 days, critical at 7 days, expired), cell capacity limits (85%/95%), low driver activity (<30%), excessive funding (>10/week), and repeated discipline actions (3+ suspensions/week). Supports `?directorId=` for admin views. Auto-generates notifications.
- **ZIBRA Director Performance Coaching**: 8 proactive coaching templates for directors covering low activity, high suspensions, cell health, lifespan expiry, multi-cell management, staff management, performance tips, and capacity warnings. Auto-generated coaching based on real-time metrics.
- **ZIBRA Driver Coaching**: 6 coaching templates for drivers (low acceptance, frequent cancellations, trust dips, wallet low balance, positive performance, availability tips). `driverCoachingLogs` table with generate/dismiss/list endpoints. Driver dashboard "ZIBA Support" card with refresh, dismiss, and "Contact Human Support" escalation. Triggers based on wallet balance <500, trust score >60, rating <4.0, offline status, or positive performance.
- **Peer-to-Peer Wallet Funding Purpose**: Optional purpose text field in "Fund Another Wallet" dialog, stored in `walletFundingTransactions.purpose` column. Displayed in confirmation step.
- **Training Center**: In-app training modules for contract directors (6 modules), employed directors (4 modules), and drivers (4 modules) with acknowledgement tracking. No financial numbers exposed. Short card format with bullet points.
- **Performance & Health Alerts**: Non-financial alert system for directors (activity drops, suspension rates, cell capacity, active driver percentage) and admins (abuse patterns, excessive suspensions, appeal volume spikes). Alerts are dismissable and trackable.
- **Store Compliance**: App Store / Play Store compliance verification covering automation disclosure, permission explanations, safety language, and accessibility standards. 12-point checklist all passing.
- **Operational Readiness**: Admin operational tools including director overview, emergency suspend controls, and 4 operational playbooks (director suspension, mass driver issues, lost-item abuse, incident response).
- **Governance Checklist**: 15-point automated governance readiness validation covering role system, ZIBRA safety, commission protection, training content, store compliance, appeals/suspensions, route security, performance alerts, lifespan enforcement, multi-cell limits, dashboard isolation, staff permissions, audit trail, ZIBRA coaching, and admin supremacy. All 15 checks passing.

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect provider for user authentication.
- **PostgreSQL**: Primary relational database.
- **Paystack**: Payment gateway for driver payouts in Nigeria.
- **Flutterwave**: Fallback payment gateway for driver payouts in Nigeria.
- **Simulation Center**: System-level simulation mode for testing.

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: ORM and migration tools.
- `passport` / `openid-client`: Authentication libraries.
- `express-session` / `connect-pg-simple`: Session management.
- `@tanstack/react-query`: Frontend data fetching and state management.
- `shadcn/ui`: UI component library.
- `zod`: Runtime schema validation.