# ZIBA - Ride Hailing Platform

## Overview

ZIBA is a ride-hailing web application designed for emerging markets. It connects riders with trusted drivers for safe, reliable transportation. The platform supports three user roles: riders who request trips, drivers who accept and complete trips, and administrators who manage the platform.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite with HMR support
- **Theme Support**: Dark/light mode with system preference detection

The frontend follows a role-based routing pattern where authenticated users are directed to different dashboards based on their role (admin, driver, or rider). Unauthenticated users see a public landing page.

### Backend Architecture

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON APIs under `/api/*` prefix
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL via connect-pg-simple

The server uses a clean separation between routes, storage layer, and authentication. Role-based middleware protects endpoints requiring specific user roles.

### Data Storage

- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation via drizzle-zod
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Managed via `drizzle-kit push` command

Key database tables:
- `users` and `sessions` - Authentication (required for Replit Auth)
- `user_roles` - Maps users to roles (admin/driver/rider)
- `driver_profiles` - Driver details, vehicle info, approval status
- `rider_profiles` - Rider contact information
- `trips` - Trip records with status tracking

### Authentication Flow

1. Users authenticate via Replit Auth (OpenID Connect)
2. Session stored in PostgreSQL sessions table
3. User record created/updated in users table
4. Role selection happens post-authentication
5. First user can become admin; subsequent admins must be approved

## External Dependencies

### Third-Party Services

- **Replit Auth**: OpenID Connect authentication provider using `openid-client` library
- **PostgreSQL**: Database provisioned via Replit's database service (requires `DATABASE_URL` environment variable)

### Key NPM Packages

- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tooling
- `passport` / `openid-client`: Authentication infrastructure
- `express-session` / `connect-pg-simple`: Session management
- `@tanstack/react-query`: Data fetching and caching
- `shadcn/ui` components via Radix UI primitives
- `zod`: Runtime schema validation

### Environment Variables Required

- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for signing session cookies
- `ISSUER_URL`: OpenID Connect issuer (defaults to Replit's OIDC)
- `REPL_ID`: Replit environment identifier

## Development Phases

### Phase 1 – Admin Features (FROZEN - Stable)
- Driver management: approve/reject/suspend drivers
- Read-only rider list with contact info
- Trip management with manual cancellation
- Admin provisioning: first user becomes admin via role selection

### Phase 2 – Driver App (FROZEN - Stable)
- Driver dashboard with profile display (including email)
- Profile setup and edit functionality
- Online/offline toggle (approved drivers only)
- Available rides display with rider names
- Ride acceptance flow
- Active trip management (start trip, complete trip)
- Pending/suspended status warnings

### Phase 3A – Rider App (FROZEN - Stable)
- Rider dashboard with current trip and recent trips
- Improved ride request form (pickup, dropoff, passenger count)
- Trip status timeline (requested → accepted → in_progress → completed)
- Rider cancel ride action (for requested and accepted status)
- Clean layout with proper empty states

### Phase 4 – Pricing & Commission Logic (FROZEN - Stable)
- Fare calculation model: Base fare ($5) + per-passenger fee ($1/passenger)
- ZIBA commission: 20% of total fare
- Driver payout: 80% of total fare
- Pricing stored per trip (fareAmount, driverPayout, commissionAmount)
- Admin dashboard shows revenue overview (completed trips, total fares, commission, driver payouts)
- Pricing utility: server/pricing.ts

### Phase 5 – Payments Simulation (FROZEN - Stable)
- Virtual wallet for drivers (walletBalance field in driver_profiles)
- Track driver earnings per trip (payout_transactions table)
- Track ZIBA earnings per trip (commissionAmount in trips)
- Admin payout ledger (Payouts tab in admin dashboard)
- Manual "mark as paid" action (admin only)
- Driver wallet credited automatically when trips complete
- No real payment integration (simulation only)

### Phase 5.5 – Directors Governance Layer (FROZEN - Stable)
- New DIRECTOR role with read-only access to admin dashboard
- Directors tab in admin dashboard (visible to admins only)
- Directors can view: Revenue overview, Payout ledger, Trips, Drivers list, Riders list
- Directors cannot: Approve drivers, Suspend users, Mark payouts as paid, Modify trips
- Role separation: Director ≠ Admin (Admin retains full control)
- director_profiles table for storing director information
- Authentication flow unchanged - directors use same login as other roles

### Phase 6 – In-App Notifications (FROZEN - Stable)
- notifications table with userId, role, title, message, type (info/success/warning), read status
- Notification bell icon in all dashboard headers (admin, driver, rider)
- Unread count badge on bell icon with real-time updates (30-second polling)
- Popover notification list with mark-as-read functionality
- Mark all as read action
- Notification triggers:
  - Rider requests ride → Notify all drivers
  - Driver accepts ride → Notify rider
  - Trip starts → Notify rider
  - Trip completes → Notify rider + admins/directors
  - Driver approved/suspended → Notify driver
  - Payout marked as paid → Notify driver
- API endpoints: GET /api/notifications, GET /api/notifications/unread-count, POST /api/notifications/:id/read, POST /api/notifications/read-all
- In-app only (no email/SMS/push notifications)

### Phase 7A – Trip History & Search (FROZEN - Stable)
- Server-side filtering with query parameters: status, startDate, endDate, driverId, riderId
- Reusable TripFilterBar component for consistent filtering across all dashboards
- TripDetailModal component showing full trip details: locations, participants, fare breakdown, timestamps
- Admin/Director Trips tab: Filter bar, clickable rows, trip detail modal
- Driver Trip History section: Filter by status/date, view past trips with earnings, click for details
- Rider Trip History section: Filter by status/date, view past rides with fares, click for details
- GET /api/trips/:tripId endpoint with role-based access control
- Storage methods: getFilteredTrips, getDriverTripHistory, getRiderTripHistoryFiltered, getTripById
- Read-only functionality (no modifications to frozen phases)

### Phase 7B – Trip Details & Cancellation Reasons (FROZEN - Stable)
- New fields in trips table: cancelledAt, cancelledBy (enum: rider/driver/admin), cancellationReason
- Enhanced trip detail response includes full cancellation info
- Cancellation endpoints updated to accept reason parameter
- TripDetailModal displays cancellation section for cancelled trips:
  - Cancelled by (rider/driver/admin)
  - Cancellation reason (if provided)
  - Cancelled timestamp
- Admin, Director, Driver, and Rider dashboards all show cancellation details
- Directors remain read-only (view cancellation info but cannot cancel)

### FROZEN Components (DO NOT MODIFY)
- Authentication flow (Replit Auth + OpenID Connect)
- Role assignments and routing logic
- Admin dashboard and all admin endpoints
- Driver dashboard and all driver endpoints
- Rider dashboard and all rider endpoints
- Notifications system and all notification endpoints