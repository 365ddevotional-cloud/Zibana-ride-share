# Zibana migration checkpoint — 2026-10-08

This migration branch is a source-only working copy of the verified Replit source backup. It is not live and is not a complete production security review.

## Changes

- Removed the development administrator injection and fake login redirects. OIDC sign-in now checks state, nonce, PKCE, verified email and session expiry. Existing user IDs are retained by matching verified email.
- Missing identity-provider settings or session secret stop startup. Configure a trusted provider such as Google. Register the exact APP_BASE_URL + /api/auth/callback/google redirect URI in its web client.
- New session cookie invalidates use of the old development/simulation sessions. Generate a fresh random SESSION_SECRET; the old Replit secret is unnecessary.
- Disabled simulation mode in production.
- Removed forced schema synchronization at startup. Restore the selected database into a NEW empty destination; do not merge development and production.
- Removed API response bodies from request logs.
- Removed Replit Vite plugins and added Railway build/start/health configuration.

- Protected live tracking subscriptions with the same login session and checked rider/driver trip ownership for tracking APIs. Recheck sessions, assignments, link expiry and revocation on every live update. Public sharing is limited to the rider's active assigned trip, for at most 120 minutes.
- Disabled the first-user administrator seed endpoint in production.

## Validation and remaining work

Production client/server build succeeded after these changes. Ten authentication/tracking/encryption policy tests passed. The production SQL backup was independently restored into isolated PGlite PostgreSQL: all 209 tables, 1,293 rows and record values matched the JSON capture using typed JSONB multiset comparisons. This is recovery validation, not a restore into Railway or a live app test.

Full TypeScript checking now passes with zero diagnostics (including a clean, non-incremental check). Five migration regression tests and ten security tests pass, and the production build passes. Repairs cover route parameter validation, real database field names, role checks, notification routing, referral and audit inserts, UUID identifiers, independent rider/director scoring, recorded GPS mileage, and an atomic, idempotent hub-return bonus ledger entry. This is not an end-to-end production feature audit; real login, payment, ride and mobile flows still need testing. The original source backup remains unchanged.

Apply `migrations/20261008_code_schema_alignment.sql` to the RESTORED DESTINATION database before starting this version. It adds missing vehicle-year, accident-review and notification-metadata fields, and enum values already required by existing features. It deletes no records. The migration was applied twice to an isolated restored production backup; all 209 tables and 1,293 original records still matched. Do not apply it to the original Replit database as part of this checkpoint. Resolved disputes and intermediate hub drop-off are neutral audit signals, avoiding invented penalties and duplicate return rewards. Legacy trip mileage uses plausible, recorded driver GPS only; missing telemetry is not replaced with an invented tax-reporting estimate.

Replit reports no active deployment or published `.replit.app` URL for this project. The current serving host of zibana.org has not been verified.

Before public launch: configure and test real provider login/logout and owner roles, complete end-to-end tracking/session tests and audit remaining endpoints, restore/compare production tables and documents in the real destination, test trip/payment/mobile flows, obtain signing credentials if publishing native apps, verify domains/webhooks and obtain approval for hosting costs. No deployment, database replacement, DNS cutover, paid service, or Replit cancellation has been performed.

The eight history companion ZIPs preserve previous Git versions and are optional for building this current snapshot. Keep them privately before closing Replit. Never upload databases, historical bundles, identity documents or private backup archives to a public source repository.

## GitHub publication scope

The migration branch contains app source/configuration and native project sources. It excludes attached_assets (unreferenced Replit uploads/pasted prompts), generated native public bundles, Replit workspace files, dependencies, build output, actual environment files, backup archives, database exports and Git-history chunks. Excluded material is preserved in the private backup/checkpoint. Existing GitHub main is not overwritten.

## Independence cleanup

Renamed integration folders and the authentication module to provider-neutral paths. Removed the Replit hostname check from the administration interface. Google login now uses /api/auth/callback/google, matching the existing client callback path; the exact destination hostname must still be registered before preview login. Existing Google client settings and the live website have not been changed.

Field encryption now requires a separate FIELD_ENCRYPTION_SECRET and rejects missing/short keys instead of deriving from a Replit ID or a hard-coded fallback. If restored records contain encrypted tax IDs, privately preserve the EXACT previous encryption secret as FIELD_ENCRYPTION_SECRET before reading them. Changing SESSION_SECRET does not change the field-encryption key. This does not re-encrypt or alter any backup data.

The verified production JSON capture contains zero enc:-formatted field values; the destination can use a fresh independent encryption secret for this snapshot. Check a fresh cutover export before selecting a key. The cloud browser could not inspect either live hostname (ERR_BLOCKED_BY_CLIENT), so live UX and role tests remain unperformed.

## Deployment preparation

Railway preview hostname: `zibana-ride-share-v4-production.up.railway.app`. Register its `/api/auth/callback/google` URL in the existing Google web client before preview sign-in. Deployment uses the destination Postgres reference, fresh session/encryption secrets and existing stored OAuth credentials. Optional AI clients initialize only when called and an API key exists.

Run `script/restore-destination.mjs` privately with the selected SQL and JSON capture and destination DATABASE_URL. It refuses a nonempty or different destination, wraps the restore and schema update in one transaction, and verifies all original records before committing. No data files are part of this repository. The pre-deploy readiness check prevents the app from going live against an unrestored database.
