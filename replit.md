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