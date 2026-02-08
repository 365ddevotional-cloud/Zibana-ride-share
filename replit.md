# ZIBA - Ride Hailing Platform

## Overview
ZIBA is a ride-hailing web application designed for emerging markets. Its primary purpose is to connect riders with drivers, offering a safe and reliable transportation solution. The platform supports seven distinct user roles to manage all aspects of operations, including trip coordination, financial oversight, and customer support. ZIBA aims to be a scalable and reliable system that enhances mobility, fosters economic opportunities, and aspires to become a leading mobility platform across multiple emerging economies.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The application features role-based dashboards, a public landing page, and supports both dark and light modes. It incorporates lazy loading, error boundaries, and loading skeletons for an optimized user experience. The UI is built to support configurable app modes (RIDER/DRIVER/UNIFIED) from a single codebase, utilizing React 18 with TypeScript, Wouter for routing, and Tailwind CSS integrated with shadcn/ui components.

### Technical Implementation
The frontend uses TanStack React Query for server state management and React hooks for local state. The backend is built with Node.js and Express.js, using TypeScript and ES modules. It follows a RESTful JSON API pattern. Authentication is handled via Replit Auth (OpenID Connect) using Passport.js, with Express sessions stored in PostgreSQL. The backend design emphasizes clean separation of concerns for routes, storage, and authentication, implementing role-based middleware for access control.

### Feature Specifications
ZIBA includes comprehensive features such as:
- **Authentication & Authorization**: Replit Auth integration and Role-Based Access Control (RBAC).
- **Multi-Role User System**: Allows a single user to hold multiple roles.
- **User & Trip Management**: Covers identity verification, fare calculation, driver payouts, and audit logging.
- **Financial Operations**: A simulated payment system with virtual wallets, dynamic country-specific pricing, and a cancellation fee system.
- **Notifications & Ratings**: In-app notifications and a mutual rating system with dispute resolution.
- **Fraud Detection**: Real-time engine with configurable signals and risk scoring.
- **Multi-Country Support**: Manages country-specific rules, taxes, and compliance.
- **Customer Support System**: Dedicated `support_agent` role and an AI-powered ZIBA Support Assistant (ZIBRA).
- **Enterprise Contracts & Billing**: Management of contracts, SLAs, and invoicing.
- **Safety & Incident Management**: SOS trigger, incident reporting, and a Safe Return Hub System.
- **Legal Compliance**: Versioned legal documents and user consent tracking.
- **Smart Onboarding**: Behavior-aware discovery, adaptive CTAs, and intent tracking.
- **Scheduled Reservations**: Advance booking functionality.
- **Tax Statement System**: Generation of PDF & CSV tax statements.
- **Universal Identity Framework**: Country-aware identity verification.
- **Director Logic System**: Manages contract/employed directors, including onboarding, lifecycle, appeals, and termination.
- **ZIBRA Coaching & Oversight**: Provides coaching for directors and drivers, and oversight signals for operational issues.
- **Performance Scoring**: Implements Director Performance Scoring (DPS) and Rider Trust Score (RTS) with auto-assigned tiers and configurable incentives/restrictions.
- **Third-Party Wallet Funding**: Allows trusted users to fund a rider's wallet with defined relationship types and limits, including fraud detection and admin controls.
- **Reporting Dashboards**: Read-only dashboards for directors with operational metrics and comparison views for administrators.
- **Complete Driver Experience**: Full driver account management with profile editing (name, email, read-only phone), vehicle management (make, model, color, year, plate with edit/re-approval flow), document management (upload/replace per document with expiry warnings), data usage controls, emergency contacts, inbox, settings, help center, and terms/privacy pages.
- **Multi-Language Support (i18n)**: 12 languages (English, French, Arabic, Hausa, Igbo, Yoruba, Swahili, Zulu, Xhosa, Afrikaans, Portuguese, Spanish) with LanguageProvider context, RTL support for Arabic, and language selection pages for ALL roles: /rider/settings/language, /driver/settings/language, /director/settings/language, /admin/settings/language. Translations integrated across Rider screens (Home, Services, Activity, Inbox, Account, Settings, Payments), Driver screens (Dashboard, Account, Earnings, Wallet, Inbox, DriverLayout nav), Director dashboard (Settings tab with language), and Admin dashboard (language page with user distribution stats). Backend APIs: GET/POST /api/user/language for persistence, POST /api/user/language/detect for smart country-based detection, GET /api/admin/user-languages for admin stats. Language source tracking via `language_source` column (values: "default", "manual", "auto_country"). Smart detection on first login: francophone Africa → French, Arabic countries → Arabic, manual selection always preserved. ZIBRA sends user language with chat requests and provides role-aware language reset guidance. Safety mechanisms: English reset buttons always visible, ZIBRA auto-response for language help keywords, draggable ZIBA Support floating button.

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