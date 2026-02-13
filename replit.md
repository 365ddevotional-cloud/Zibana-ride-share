# ZIBANA - Ride Hailing Platform

## Overview
ZIBANA is a ride-hailing web application designed for emerging markets. Its primary purpose is to connect riders with drivers, offering a safe and reliable transportation solution. The platform supports seven distinct user roles to manage all aspects of operations, including trip coordination, financial oversight, and customer support. ZIBANA aims to be a scalable and reliable system that enhances mobility, fosters economic opportunities, and aspires to become a leading mobility platform across multiple emerging economies.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The application features role-based dashboards, a public landing page, and supports both dark and light modes. It incorporates lazy loading, error boundaries, and loading skeletons for an optimized user experience. The UI is built to support configurable app modes (RIDER/DRIVER/UNIFIED) from a single codebase, utilizing React 18 with TypeScript, Wouter for routing, and Tailwind CSS integrated with shadcn/ui components. The Admin dashboard uses an Executive Visual Theme with dark navy sidebar, blue-600 active highlights, color-coded KPI cards, section cards with left accent stripes, shadow-lg polish, and a max-w-7xl content container. Super Admin badge uses emerald styling. Typography uses tracking-tight headings and slate-based text hierarchy.

### Technical Implementation
The frontend uses TanStack React Query for server state management and React hooks for local state. The backend is built with Node.js and Express.js, using TypeScript and ES modules, following a RESTful JSON API pattern. Authentication is handled via Replit Auth (OpenID Connect) using Passport.js, with Express sessions stored in PostgreSQL. The backend design emphasizes clean separation of concerns for routes, storage, and authentication, implementing role-based middleware for access control.

### Feature Specifications
ZIBANA includes comprehensive features such as:
- **Authentication & Authorization**: Replit Auth integration, multi-role user system with mandatory post-auth role selection, and Role-Based Access Control (RBAC). Sessions persist for 1 week.
- **User & Trip Management**: Covers identity verification, fare calculation, driver payouts, and audit logging.
- **Financial Operations**: Simulated payment system with virtual wallets, dynamic country-specific pricing, and cancellation fees.
- **Notifications & Ratings**: In-app notifications and a mutual rating system with dispute resolution.
- **Fraud Detection**: Real-time engine with configurable signals and risk scoring.
- **Multi-Country Support**: Manages country-specific rules, taxes, and compliance.
- **Customer Support System**: Dedicated `support_agent` role and an AI-powered ZIBANA Support Assistant (ZIBRA).
- **Enterprise Contracts & Billing**: Management of contracts, SLAs, and invoicing.
- **Safety & Incident Management**: SOS trigger, incident reporting, and a Safe Return Hub System.
- **Legal Compliance**: Versioned legal documents and user consent tracking.
- **Smart Onboarding**: Behavior-aware discovery, adaptive CTAs, and intent tracking.
- **Scheduled Reservations**: Advance booking functionality.
- **Tax Statement System**: Generation of PDF & CSV tax statements.
- **Universal Identity Framework**: Country-aware identity verification.
- **Director Logic System**: Manages contract/employed directors, including onboarding, lifecycle, appeals, and termination.
- **ZIBRA Coaching & Oversight**: Provides coaching for directors and drivers, oversight signals for operational issues, proactive signal engine, director performance coaching, trust score assistance, and legal safety guardrails.
- **Performance Scoring**: Implements Director Performance Scoring (DPS) and Rider Trust Score (RTS) with auto-assigned tiers and configurable incentives/restrictions.
- **Third-Party Wallet Funding**: Allows trusted users to fund a rider's wallet with defined relationship types and limits, including fraud detection and admin controls.
- **Ride Classification System**: Six ride classes (Go, Plus, Comfort, Elite, PetRide, SafeTeen) with per-class pricing, driver eligibility requirements, availability-aware selection, driver preferences, and admin class management.
- **Reporting Dashboards**: Read-only dashboards for directors with operational metrics and comparison views for administrators.
- **Driver Preferences & Filters**: Comprehensive preference system allowing drivers to control ride matching via trip distance, payment acceptance, preferred areas, and ride class toggles. Includes abuse prevention and admin controls.
- **Driver Training Mode**: Allows pending drivers to practice using the app before full approval, bypassing identity verification and setup requirements.
- **Complete Driver Experience**: Full driver account management with profile editing, vehicle management, document management, data usage controls, emergency contacts, inbox, settings, and help center.
- **Multi-Language Support (i18n)**: Supports 12 languages with RTL support for Arabic, language selection pages for all roles, and smart country-based detection for initial language setting.
- **Admin Control Center**: Dedicated routable section at `/admin/control/:section` with sub-pages for Overview, Monitoring, Health Alerts, Launch Readiness, and Ops Readiness, featuring breadcrumb navigation and a consistent executive theme.
- **QA Mode & Monitoring**: Internal QA stabilization system with `qaActivityLogs` table tracking 9 event types (driver approval, rider signup, trip lifecycle, training toggle, payment simulation, messaging). QA Monitor page at `/admin/control/qa-monitor` with auto-refresh (10s), KPI cards, error tracking, activity log table, and interactive QA Flow Checklist (Driver/Rider/Admin flows with localStorage persistence). Development Mode badge in admin header. Global structured error middleware returns `{ message, code, context }` for all 500 errors. All payments remain simulated-only in non-production mode.

### System Design Choices
The data storage layer uses PostgreSQL as the database, with Drizzle ORM and Zod for schema validation. The schema is comprehensive, covering all operational aspects from users and trips to financial transactions, fraud profiles, and legal compliance.

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect provider for user authentication.
- **PostgreSQL**: Primary relational database.
- **Paystack**: Payment gateway for driver payouts in Nigeria.
- **Flutterwave**: Fallback payment gateway for driver payouts in Nigeria.

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: ORM and migration tools.
- `passport` / `openid-client`: Authentication libraries.
- `express-session` / `connect-pg-simple`: Session management.
- `@tanstack/react-query`: Frontend data fetching and state management.
- `shadcn/ui`: UI component library.
- `zod`: Runtime schema validation.