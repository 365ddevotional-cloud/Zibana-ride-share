# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application for emerging markets, connecting riders with drivers for safe and reliable transportation. It supports seven user roles to manage operations, trip coordination, financial oversight, and customer support. The platform aims to be a scalable and reliable solution, enhancing mobility and fostering economic opportunities, with the vision of becoming a leading mobility platform across multiple emerging economies.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for client-side navigation.
- **State Management**: TanStack React Query for server state; React hooks for local state.
- **Styling**: Tailwind CSS integrated with shadcn/ui components.
- **UI/UX**: Role-based dashboards, public landing page, dark/light mode, lazy loading, error boundaries, loading skeletons, and configurable app modes (RIDER/DRIVER/UNIFIED) from a single codebase.

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
- **Schema**: Comprehensive schema covering users, trips, wallets, notifications, disputes, fraud profiles, incentive programs, country-specific data, support tickets, organization contracts, enterprise billing, referral codes, marketing, and feature flags.

### Core Features
- **Authentication & Authorization**: Replit Auth integration and Role-Based Access Control (RBAC).
- **Multi-Role User System**: A single user can possess multiple roles.
- **User & Trip Management**: Full lifecycle management including identity verification, fare calculation, driver payouts, and audit logging.
- **Financial Operations**: Simulated payment system with virtual wallets, dynamic country-specific pricing, payment provider abstraction, and a cancellation fee system.
- **Notifications & Ratings**: In-app notifications and a mutual rating system with dispute resolution.
- **Fraud Detection**: Real-time engine with configurable signals and risk scoring.
- **Driver Incentives**: Management of various incentive programs.
- **Multi-Country Support**: Manages country-specific rules, taxes, compliance, and launch control.
- **Customer Support System**: Dedicated `support_agent` role, ticket management, and an AI-powered ZIBA Support Assistant (ZIBRA) with context-sensitive responses.
- **Enterprise Contracts & Billing**: Management of contracts, SLAs, and invoicing.
- **Safety & Incident Management**: SOS trigger, incident reporting, auto-escalation, suspension management, Accident Report Protocol, Lost Item Protocol with AI fraud detection, and a Safe Return Hub System.
- **Legal Compliance**: Versioned legal documents, user consent tracking, and country-specific legal localization.
- **Growth & Marketing**: Referral codes, marketing campaign tracking, and in-app tip banners.
- **Smart Onboarding**: Behavior-aware discovery on the welcome page with intent tracking (session-based, anonymous), adaptive CTAs that change based on user interest, ZIBRA soft intro bubble on 2nd/3rd interaction, intent pass-through to signup flow, and admin Welcome Insights panel with conversion metrics.
- **Scheduled Reservations**: Advance booking functionality.
- **Driver and Rider Apps**: Restructured interfaces with bottom navigation, performance insights, and comprehensive settings.
- **Tax Statement System**: Generation of PDF & CSV tax statements with country-specific configurations.
- **Universal Identity Framework**: Country-aware identity verification for drivers and riders.
- **Driver Training Module**: Interactive training for key protocols.
- **Driver Accident Relief Fund**: Financial support for drivers involved in verified accidents.
- **Director Logic System**: Comprehensive contract/employed director management with daily commission eligibility, cell management, driver suspend/activate authority, ZIBRA director mode, and Super Admin director settings panel with immutable audit logging. Includes director onboarding, lifecycle management, appeals system, and termination safety.
- **Director Lifecycle Management**: Includes lifespan controls, auto-suspension on expiry, commission freezing, and driver cell locking.
- **Multi-Cell Support**: Up to 3 driver cells per contract director, each with driver capacity and commissionable caps.
- **Director Dashboard**: Dedicated private dashboard with profile overview, lifespan countdown, cell tabs with per-cell metrics, staff list, coaching alerts, and action logs.
- **Director Staff & Team Roles**: Contract directors can create staff accounts with scoped access, requiring admin approval.
- **Director Audit & Accountability**: Enhanced action logging for all director governance actions, capturing actor, role, action, target, timestamp, before/after state, and IP address.
- **Director Appointment System**: Super Admin flow for appointing directors, configuring lifespan dates, cell limits, and commission rates, with activation requiring recruited drivers.
- **Director Payout Summaries & Controls**: `directorPayoutSummaries` table with full state machine, period tracking, eligibility snapshots, partial release amounts, ZIBRA flagging, and complete dispute workflow. Auto-hold triggers on suspension/expiry.
- **Director Analytics API**: Safe read-only endpoint exposing driver counts, active drivers, commissionable count, weekly growth trends, funding counts, trust scores, cell health badges, and activity ratios (no financial data).
- **ZIBRA Oversight Watch Signals**: Detects contract expiry, cell capacity limits, low driver activity, excessive funding, and repeated discipline actions, generating auto-notifications.
- **ZIBRA Director Performance Coaching**: Proactive coaching templates for directors based on real-time metrics.
- **ZIBRA Driver Coaching**: Coaching templates for drivers based on performance, wallet balance, and ratings.
- **Peer-to-Peer Wallet Funding Purpose**: Optional purpose text field for wallet funding transactions.
- **Training Center**: In-app training modules for directors and drivers with acknowledgement tracking.
- **Performance & Health Alerts**: Non-financial alert system for directors and admins regarding operational metrics.
- **Operational Readiness**: Admin operational tools including director overview, emergency suspend controls, and operational playbooks.
- **Governance Checklist**: 22-point automated validation covering system safety, security, and compliance.
- **Director Fraud & Abuse Detection**: `directorFraudSignals` table with signal types, 3-level response system, automated fraud scan engine, and admin review panel.
- **Director-Admin Conflict Resolution**: Structured dispute resolution system with status tracking, bidirectional messaging, and escalation.
- **Director Termination & Wind-Down**: Tracks full wind-down process (funding disabled, staff revoked, drivers reassigned/unassigned, payouts held, audit sealed) with Super Admin-only termination and reinstatement capability. Three termination modes: expiration, suspension, termination.
- **Director Succession & Cell Continuity**: `directorSuccessions` table with full succession planning, 6-step execution timeline, ZIBRA succession summaries, payout decisions (release/hold/partial/forfeit), staff disabling, driver reassignment (to director, new director, or platform pool). Expiring directors early warning. Admin succession panel with timeline visualization.
- **Driver Protection During Termination**: Drivers remain active, receive neutral notifications ("Your Director assignment has been updated"), and have earnings preserved during director termination. No automatic succession — admin decides.
- **Director Dashboard Read-Only Mode**: Dashboard enters read-only mode for suspended/terminated/expired directors with status-specific banners and all action buttons disabled.
- **Data Retention & Legal Safety**: Permanent record retention and immutable audit logs.
- **Director Performance Scoring & Auto-Incentives**: DPS (0-100) with 5 weighted components (driver activity 30%, driver quality 25%, driver retention 20%, compliance & safety 15%, admin feedback 10%). Auto-assigns tiers (Gold/Silver/Bronze/At-Risk) with configurable thresholds. Auto-incentives for Gold tier, auto-restrictions for At-Risk. Super Admin weight configuration panel with full audit logging. Performance tab in Director Dashboard with score gauge, tier badge, component breakdown, history, and active incentives/restrictions. ZIBRA coaching templates for performance guidance.
- **Rider Trust Score (RTS)**: Rider trust scoring system (0-100) with 5 weighted components (reliability 35%, payment behavior 25%, conduct & safety 20%, account stability 10%, admin flags 10%). Auto-assigns tiers (Platinum/Gold/Standard/Limited) with configurable thresholds. Tier affects cancellation grace periods, ride matching priority, and support response priority. Super Admin weight configuration panel.
- **Rider Loyalty & Wallet Growth**: Admin-controlled loyalty incentives (ride credits, reduced fees), wallet health indicators, wallet usage encouragement. P2P wallet funding support (parent-child, employer-staff, friend-friend) with recipient acceptance required and caps enforced.
- **Rider Dashboard Trust Section**: Trust score display with tier badge, component breakdown, wallet health indicator, active loyalty incentives, and contextual ZIBRA tips. Encouraging, informational, non-judgmental tone. No internal formulas exposed.
- **Admin Rider Trust Panel**: Overview of all rider trust scores with tier filtering, weight configuration, manual rider flagging, loyalty incentive granting, and audit logs.

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