# Zibana migration checkpoint — 2026-10-08

This is a private working copy of the verified Replit source backup. It is not live and is not a complete production security review.

## Changes

- Removed the development administrator injection and fake login redirects. OIDC sign-in now checks state, nonce, PKCE, verified email and session expiry. Existing user IDs are retained by matching verified email.
- Missing identity-provider settings or session secret stop startup. Configure a trusted provider such as Google. Register the exact APP_BASE_URL + /api/callback redirect URI in its web client.
- New session cookie invalidates use of the old development/simulation sessions. Generate a fresh random SESSION_SECRET; the old Replit secret is unnecessary.
- Disabled simulation mode in production.
- Removed forced schema synchronization at startup. Restore the selected database into a NEW empty destination; do not merge development and production.
- Removed API response bodies from request logs.
- Removed Replit Vite plugins and added Railway build/start/health configuration.

- Protected live tracking subscriptions with the same login session and checked rider/driver trip ownership for tracking APIs. Recheck sessions, assignments, link expiry and revocation on every live update. Public sharing is limited to the rider's active assigned trip, for at most 120 minutes.
- Disabled the first-user administrator seed endpoint in production.

## Validation and remaining work

Production client/server build succeeded after these changes. Eight authentication/tracking policy tests passed. The production SQL backup was independently restored into isolated PGlite PostgreSQL: all 209 tables, 1,293 rows and record values matched the JSON capture using typed JSONB multiset comparisons. This is recovery validation, not a restore into Railway or a live app test.

Full TypeScript checking reports 308 errors, the same count before this tracking change. Most are in the existing routes and reflect schema/API mismatches and duplicate definitions. No diagnostics were reported in the changed authentication, socket or tracking-policy files. These errors require review before launch; a successful bundled build is not proof that every feature works. The original source backup remains unchanged.

Before public launch: configure and test real provider login/logout and owner roles, complete end-to-end tracking/session tests and audit remaining endpoints, restore/compare production tables and documents in the real destination, test trip/payment/mobile flows, obtain signing credentials if publishing native apps, verify domains/webhooks and obtain approval for hosting costs. No deployment, database replacement, DNS cutover, paid service, or Replit cancellation has been performed.

The eight history companion ZIPs preserve previous Git versions and are optional for building this current snapshot. Keep them privately before closing Replit. Never upload databases, historical bundles, identity documents or private backup archives to a public source repository.

## GitHub publication scope

The migration branch contains app source/configuration and native project sources. It excludes attached_assets (unreferenced Replit uploads/pasted prompts), generated native public bundles, Replit workspace files, dependencies, build output, actual environment files, backup archives, database exports and Git-history chunks. Excluded material is preserved in the private backup/checkpoint. Existing GitHub main is not overwritten.
