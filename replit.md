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
- **Director Logic System**: Comprehensive contract/employed director management with daily commission eligibility (77% active ratio, 1000 commissionable cap, 1300 cell cap), cell management, driver suspend/activate authority (contract only), ZIBRA director mode (23 templates), and Super Admin director settings panel with immutable audit logging. Validated with 326 automated tests across 6 phases (daily simulations, edge cases, ZIBRA stress-tests, permission checks, audit verification, acceptance checks). Bug fixes applied: contract-type enforcement on suspend/activate routes, ZIBRA keyword gaps for "cheating" and "deactivate" queries.

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