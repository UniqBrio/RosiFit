# Staff PINs and recovery answers survive the move to a new Mumbai PIN_PEPPER — 08-Oct-2026

**Asked (verbatim):** "Proceed with Option 1. I explicitly approve the additive Singapore change: create a
dedicated authenticated pin-verify server-to-server Edge Function and one new strong random
request-authentication secret shared only between the Singapore verifier and Mumbai migration verifier.
... Implement PIN and recovery migration, database version tracking, tests, and security documentation on a
review branch only. Do not deploy ..."

**Class:** CHANGE (scoped), part of `requests/2026-10-06-move-production-to-mumbai.md`. Design and
deployment order: `docs/security/PIN_PEPPER_MIGRATION.md`.

**Why:** the old `PIN_PEPPER` cannot be recovered and Mumbai has a new one. Without this, every staff PIN
and recovery answer stops working at cutover.

**What changes:**
- `0091_pin_pepper_version.sql` (Mumbai only): two additive version columns, default 0.
- New `pin-verify` (Singapore only): HMAC-authenticated, one-word answer, read-only on application tables.
- New `_shared/pinVerifyProtocol.ts` and `_shared/pinVerifyClient.ts`.
- `auth-login`, `recovery-check`: version 0 asks Singapore once, then re-secures; version 1 is local.
- `_shared/identity.ts`: every PIN Mumbai sets is marked version 1. `auth-bootstrap`: new answers are 1.
  `_shared/pin.ts`: `CURRENT_PIN_PEPPER_VERSION = 1`.
- `config.toml`: `pin-verify` declared `verify_jwt = false` (HMAC is its door).
- `supabase/reports/pin_pepper_coverage.sql`.

**Not changed:** existing Singapore secrets and functions; unsubscribe (B2); members; every other function.

**Specs:** `src/data/pinPepperMigration.test.ts` (20; real handlers, two projects, two peppers);
`supabase/tests/68_pin_pepper_version.sql` (7).
