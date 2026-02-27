# ZIBANA - Ride Hailing Platform

## Overview
ZIBANA is a ride-hailing web application for emerging markets, connecting riders and drivers. It supports seven user roles to manage operations, including trip coordination, finance, and customer support. ZIBANA aims to be a scalable, reliable mobility platform that fosters economic opportunities and becomes a leader in multiple emerging economies.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
The application features role-based dashboards, a public landing page, and supports dark/light modes. It includes lazy loading, error boundaries, and loading skeletons for an optimized user experience. The UI is built with React 18, TypeScript, Wouter for routing, and Tailwind CSS with shadcn/ui components, supporting configurable app modes (RIDER/DRIVER/UNIFIED) from a single codebase. Admin dashboards use an Executive Visual Theme with specific color schemes and polish for clarity.

### Technical Implementation
The frontend uses TanStack React Query for server state and React hooks for local state. The backend is built with Node.js and Express.js, using TypeScript and ES modules, following a RESTful JSON API. Authentication uses Replit Auth (OpenID Connect) via Passport.js, with Express sessions stored in PostgreSQL. The backend design emphasizes separation of concerns for routes, storage, and authentication, with role-based middleware for access control.

### Feature Specifications
ZIBANA includes:
- **Authentication & Authorization**: Replit Auth, multi-role system, RBAC, 1-week session persistence.
- **User & Trip Management**: Identity verification, fare calculation, driver payouts, audit logging.
- **Financial Operations**: Simulated payments, virtual wallets, dynamic country-specific pricing, cancellation fees.
- **Notifications & Ratings**: In-app notifications, mutual rating system with dispute resolution.
- **Fraud Detection**: Real-time engine with configurable signals and risk scoring.
- **Multi-Country Support**: Manages country-specific rules, taxes, and compliance.
- **Customer Support System**: `support_agent` role and AI-powered ZIBANA Support Assistant (ZIBRA).
- **Enterprise Contracts & Billing**: Contract, SLA, and invoicing management.
- **Safety & Incident Management**: SOS trigger, incident reporting, Safe Return Hub.
- **Legal Compliance**: Versioned legal documents, user consent tracking.
- **Smart Onboarding**: Behavior-aware discovery, adaptive CTAs, intent tracking.
- **Scheduled Reservations**: Advance booking.
- **Tax Statement System**: PDF & CSV generation.
- **Universal Identity Framework**: Country-aware identity verification.
- **Director Logic System**: Manages contract/employed directors, including onboarding, lifecycle, appeals, and termination.
- **ZIBRA Coaching & Oversight**: Coaching for directors/drivers, operational oversight signals, performance coaching, trust score assistance, legal safety guardrails.
- **Performance Scoring**: Director Performance Scoring (DPS) and Rider Trust Score (RTS) with tiers and incentives/restrictions.
- **Third-Party Wallet Funding**: Trusted users fund rider wallets with relationship types and limits, including fraud detection.
- **Ride Classification System**: Six ride classes (Go, Plus, Comfort, Elite, PetRide, SafeTeen) with per-class pricing, driver eligibility, availability-aware selection, driver preferences, and admin management.
- **Reporting Dashboards**: Read-only dashboards for directors with operational metrics and comparison views for administrators.
- **Driver Preferences & Filters**: Drivers control ride matching via distance, payment, areas, and ride class toggles. Includes "Accept While On Trip".
- **Driver Pro v1**: RideRequestOverlay with 12s countdown, Google Maps deep-link navigation buttons.
- **Driver Training Mode**: Practice app usage for pending drivers.
- **Complete Driver Experience**: Profile editing, vehicle/document management, data usage, emergency contacts, inbox, settings, help center.
- **Multi-Language Support (i18n)**: 12 languages with RTL support, language selection, smart country-based detection.
- **Admin Control Center**: Dedicated routable section `/admin/control/:section` with overview, monitoring, health alerts, launch/ops readiness.
- **QA Mode & Monitoring**: Internal QA stabilization with `qaActivityLogs` table, QA Monitor page, auto-refreshing KPIs, error tracking, interactive QA Flow Checklist.
- **Safe Rating Initialization**: New riders/drivers start with 5.00 rating, "New User" badge, and automatic pairing blocks for ratings below 3 stars.

### System Design Choices
Data storage uses PostgreSQL with Drizzle ORM and Zod for schema validation. The schema covers users, trips, transactions, fraud profiles, and legal compliance.

## External Dependencies

### Third-Party Services
- **Replit Auth**: OpenID Connect provider.
- **PostgreSQL**: Primary relational database.
- **Paystack**: Payment gateway (Nigeria).
- **Flutterwave**: Fallback payment gateway (Nigeria).

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: ORM and migration tools.
- `passport` / `openid-client`: Authentication libraries.
- `express-session` / `connect-pg-simple`: Session management.
- `@tanstack/react-query`: Frontend data fetching and state management.
- `shadcn/ui`: UI component library.
- `zod`: Runtime schema validation.

### Capacitor Mobile Integration
- Capacitor 7.5.0 with core/android/ios 8.1.0 and specific plugins for geolocation, app, device.
- Configurable API Base URL via `VITE_API_BASE_URL` for mobile deployments.

### Driver Location Tracking Engine
- `client/src/lib/trackingEngine.ts` for foreground GPS tracking via Capacitor Geolocation.
- `client/src/hooks/useDriverTracking.ts` provides tracking state and controls.
- Uploads throttled by time (3s) or distance (20m).
- Backend: `POST /api/driver/location` (upsert), `GET /api/driver/location/latest`.

### WebSocket & Real-Time Features
- Socket.IO server on `/ws` with room-based events (`driver:${driverId}`, `trip:${tripId}`, `token:${token}`).
- Stores trip polyline history in `driver_location_points`.
- `emergency_tracking_links` for public tracking.
- Rider live map and public tracking page powered by WebSockets.

### Android Foreground Service & High Priority Ride Alerts
- `DriverForegroundService.kt`: Sticky foreground service for online status.
- `RideIncomingActivity.kt`: Full-screen intent activity for ride alerts with sound/vibration/screen wake.
- `DriverServicePlugin.kt`: Capacitor plugin bridging JS to native features.
- `OnlineOverlayService.kt`: Optional draggable "Online Bubble" overlay with ride alert functionality.

### Android Picture-in-Picture (PiP) Mode
- `android:supportsPictureInPicture="true"` enabled for MainActivity.
- Automatic PiP entry when driver is online or has an active trip.