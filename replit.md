# ZIBA - Ride Hailing Platform

## Overview

ZIBA is a ride-hailing web application designed for emerging markets, aiming to connect riders with trusted drivers for safe and reliable transportation. The platform supports seven key user roles: riders, drivers, administrators, directors, finance, trip coordinators, and support agents, facilitating comprehensive platform management, robust trip coordination, financial tracking, and customer support. Its vision is to provide a scalable and reliable solution for ride-hailing operations, enhancing mobility and economic opportunities in its target markets.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite
- **UI/UX**: Role-based routing to specific dashboards (admin, driver, rider) and a public landing page for unauthenticated users. Dark/light mode with system preference detection.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON APIs under `/api/*`
- **Authentication**: Replit Auth (OpenID Connect) via Passport.js
- **Session Management**: Express sessions stored in PostgreSQL
- **Design**: Emphasizes clean separation of concerns (routes, storage, authentication) and uses role-based middleware for endpoint protection.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema**: Defined in `shared/schema.ts`
- **Migrations**: Managed via `drizzle-kit push`
- **Key Tables**: `users`, `sessions`, `user_roles`, `driver_profiles`, `rider_profiles`, `trip_coordinator_profiles`, `trips`, `notifications`, `ratings`, `disputes`, `refunds`, `chargebacks`, `wallets`, `wallet_transactions`, `wallet_payouts`, `audit_logs`, `fraud_risk_profiles`, `fraud_events`, `incentive_programs`, `incentive_earnings`, `countries`, `tax_rules`, `exchange_rates`, `compliance_profiles`, `support_tickets`, `support_messages`, `organization_contracts`, `service_level_agreements`, `enterprise_invoices`, `referral_codes`, `referral_events`, `marketing_campaigns`, `partner_leads`, `feature_flags`.

### Core Features
- **Authentication & Authorization**: Replit Auth integration with role selection, and comprehensive Role-Based Access Control (RBAC) across various user roles.
- **User & Trip Management**: Full lifecycle management of users (approval, suspension) and trips (request to completion, including cancellation).
- **Financial Operations**: Fare calculation, commission management, driver payouts, simulated payment system with virtual wallets, and payout cycles. Includes refunds, adjustments, chargebacks, and reconciliation.
- **Notifications**: In-app notifications for real-time updates on critical events.
- **Ratings & Moderation**: Mutual rating system for users, and a dispute management system with admin moderation capabilities.
- **Fraud Detection**: Real-time fraud detection engine with configurable signals, risk scoring, and resolution workflows.
- **Driver Incentives**: System for creating and managing various incentive programs (e.g., trip, streak, peak, quality, promo bonuses) integrated with driver wallets, with fraud prevention checks.
- **Trip Coordinator Module**: Functionality for institutional users to book trips for beneficiaries, manage organization profiles, view trip history, and handle support.
- **Multi-Country Support**: Management of countries, tax rules (VAT, sales, service), exchange rates, and compliance profiles to support international operations.
- **Customer Support System**: Dedicated `support_agent` role, ticket lifecycle management (open, in_progress, escalated, resolved, closed), priority levels, categories, and a messaging interface for users and agents.
- **Enterprise Contracts & Billing**: Organization contract management with SLAs, multiple billing models, invoice generation, and payment tracking for institutional clients.

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

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_SECRET`: Secret for session cookies.
- `ISSUER_URL`: OpenID Connect issuer.
- `REPL_ID`: Replit environment identifier.
- `VITE_APP_ENV`: App environment (development/staging/production).

## Recent Changes

### Phase 20 – Post-Launch Monitoring & KPIs (January 2026)
- Database schema additions:
  - `feature_flags`: Gradual rollout control with name, description, enabled status, rollout percentage
- Metrics aggregation system:
  - Platform metrics: trip success rate, cancellation rate, support ticket volume
  - Rider metrics: new signups, repeat usage rate, total riders
  - Driver metrics: active drivers, acceptance rate, completion rate
  - Organization metrics: active orgs, trips per org, SLA compliance
  - Financial metrics: gross fares, platform commission, refund volume, chargebacks, net revenue
- Feature flags: Hash-based user assignment for consistent rollout experiences
- Threshold alerts: Automatic warnings for cancellation rates >30% and chargeback counts >10
- Storage layer: 11 new methods (createFeatureFlag, isFeatureEnabled, getPlatformMetrics, getMetricsOverview, etc.)
- API routes: 9 endpoints (metrics overview, platform/riders/drivers/orgs/financials, feature flags CRUD)
- Admin dashboard: Monitoring tab with KPI cards, alert displays, feature flag management
- Full audit logging for feature flag operations

### Phase 19 – Growth, Marketing & Partnerships (January 2026)
- Database schema additions:
  - `referral_codes`: User-generated referral codes with rewards tracking
  - `referral_events`: Tracks code usage (code_used, signup_completed, first_trip_completed)
  - `marketing_campaigns`: Campaign management (REFERRAL, PROMO, PARTNERSHIP types)
  - `partner_leads`: Partner pipeline tracking (NEW → CONTACTED → IN_DISCUSSION → SIGNED/LOST)
- Storage layer: 20+ methods for referrals, campaigns, partner leads, growth stats
- API routes: 11 endpoints with RBAC for growth tracking
- ReferralSection component: Reusable referral code creation, sharing, and stats display
- Admin dashboard: Growth tab with referral codes, campaigns, partner leads management
- Full audit logging for all growth operations

### Phase 18 – Contracts, SLAs & Enterprise Billing (January 2026)
- Database schema additions:
  - `organization_contracts`: Enterprise contracts with organization types (NGO, HOSPITAL, CHURCH, SCHOOL, GOV, CORPORATE), billing models (PREPAID, POSTPAID, MONTHLY_INVOICE), terms and dates
  - `service_level_agreements`: SLA definitions with types (RESPONSE_TIME, COMPLETION_RATE, AVAILABILITY), targets, and measurement periods
  - `enterprise_invoices`: Invoice tracking with period dates, trip counts, amounts, and status (DRAFT, ISSUED, PAID, OVERDUE)
- Storage layer: 15+ methods for contract lifecycle management (createOrganizationContract, updateContractStatus, generateInvoiceForContract, getSLAsByContract, getContractStats, etc.)
- API routes: 11 endpoints with RBAC (Admin/Finance: full access, Director: view, Trip Coordinator: own contract only)
- Admin dashboard: Contracts tab with statistics cards, contract list with create/edit dialogs, invoice management with status updates
- Coordinator dashboard: Contract tab showing contract details and invoice history
- Contract workflow: Admin creates contract → Links to Trip Coordinator → Trips tracked → Invoices auto-generated → Finance updates status
- Full audit logging for all contract and invoice operations

### Phase 17 – Mobile App Optimization & Store Readiness (January 2026)
- Performance optimizations:
  - Lazy loading for heavy dashboard components (Admin, Driver, Rider, Coordinator, Support)
  - Reduced initial bundle size with React.lazy and Suspense
  - Smart retry logic for failed API requests (exponential backoff)
  - Stale time configuration for query caching (5 minutes)
- Error handling & stability:
  - Global ErrorBoundary component with user-friendly fallback UI
  - ComponentErrorFallback for graceful component failures
  - Network error utilities with user-friendly messages
  - NetworkStatusIndicator showing offline/online status
- Loading states:
  - DashboardSkeleton for dashboard loading
  - TableSkeleton, CardSkeleton, FormSkeleton, TripCardSkeleton
  - ProfileSkeleton for user profile loading
- Network & offline behavior:
  - Online/offline status detection
  - Automatic reconnection notification
  - Retry logic for server errors (5xx)
  - No retry for client errors (4xx)
- Environment configuration:
  - config.ts with environment detection (dev/staging/production)
  - Feature flags for test accounts, debug panel, mock payments
  - Environment-specific API base URLs
- App store configuration (app.config.json):
  - Android: package name, version, permissions with justifications, icon sizes
  - iOS: bundle identifier, privacy labels, info.plist descriptions
  - Store metadata: descriptions, keywords, privacy policy URLs
- Security compliance:
  - No debug logs in production code (only server request logging)
  - No secrets exposed in frontend
  - RBAC enforced on all protected endpoints
  - Input validation and XSS prevention

### Phase 20.5 – Navigation & UX Polish (January 2026)
- Admin KPI cards now clickable with ChevronRight indicators, navigating to relevant dashboard tabs
- Logo component: Link wrapper with `linkToHome` prop (default true), clicking ZIBA logo navigates to public home "/"
- ProfileDropdown component: Role-aware dropdown menus replacing separate avatar + logout button
  - All 7 roles supported: admin, driver, rider, trip_coordinator, support_agent, director, finance
  - Role-specific menu items (Profile, Settings, Earnings for drivers; Org Profile, Billing for coordinators, etc.)
- All dashboards updated: Admin, Rider, Driver, Coordinator, Support now use unified ProfileDropdown
- Support dashboard modernized: Sticky header with Logo, ThemeToggle, role badge, and ProfileDropdown
- StatusBadge extended with dispute statuses: open, under_review, resolved, rejected
- TripFilterBar prop consistency fix (status vs statusFilter)

### Key Files Added/Modified
- `client/src/components/error-boundary.tsx`: Global and component error boundaries
- `client/src/components/loading-skeleton.tsx`: Loading skeleton components
- `client/src/components/network-status.tsx`: Network status indicator
- `client/src/lib/network-utils.ts`: Network utilities and retry logic
- `client/src/lib/config.ts`: Environment configuration
- `client/src/App.tsx`: Lazy loading, error boundary integration
- `client/src/lib/queryClient.ts`: Retry logic for queries/mutations
- `app.config.json`: Complete app store configuration
- `client/src/components/logo.tsx`: Logo with home navigation
- `client/src/components/profile-dropdown.tsx`: Role-aware profile dropdown menus
- `client/src/components/status-badge.tsx`: Extended status types for disputes