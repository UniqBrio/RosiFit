# Environments

> Ambiguity here produces "which database did that just write to?" — a question with no good
> answers, usually asked after the fact.

> **Filled at framework adoption, 02-Sep-2026,** from `db/harness/`, `src/data/repository.ts`,
> `src/lib/supabase.ts`, `.env.example` and `supabase/SETUP.md`.

RosiFit has **three** environments, not the template's four. There is no staging, and saying so
is more useful than leaving an empty row that looks like an oversight.

| Name | Purpose | URL | Datastore identifier | Who may write | Automated target? |
|---|---|---|---|---|---|
| **fixtures** | The app with no backend at all | `expo start` / static export | none — `src/data/mock.ts` | anyone; nothing persists | yes — no data exists to harm |
| **harness** | Automated schema + policy tests | none (psql only) | local Postgres 16, socket `/tmp`, port `5433`, database `rosifit` | CI + developers | **yes — the only automated target** |
| **production** | Real users | Vercel project `rosi-fit` | Supabase project `lhpzhkzbnquwjljmbylo` ("Rosifit") | **approved deploys only** | **NEVER without explicit instruction** |

**There is no staging.** RosiFit has one Supabase project. A change is proven against the harness
and then goes to production; there is no third place for it to sit. Recorded here so nobody plans
around a staging environment that does not exist — see TECH_DEBT if that becomes a constraint.

## Running the harness

```
npm run test:db     # start the cluster if it is not up, then run all 135 assertions
npm run db:start    # just the cluster
```

`db/harness/start.sh` brings up a local Postgres 16 on the socket and port in the table above. It
finds the server binaries by searching the platform bin directories rather than trusting `PATH`:
Debian and Ubuntu link only the *client* tools into `/usr/bin`, which is how a complete Postgres 16
came to be recorded as absent (TD-010, ADR 013).

`PGHOST`, `PGPORT` and `PGUSER` override the defaults. When `PGHOST` names a TCP host, `start.sh`
confirms that server is reachable and starts nothing — which is how the `db-harness` job in
`.github/workflows/ci.yml` runs *the same command* against `services: postgres:16`. The suite
therefore no longer depends on any one machine, and rule 3 below is enforceable rather than
aspirational.

## How the app chooses

`src/data/repository.ts` decides once, at module load, and exports `dataSource`:

- `EXPO_PUBLIC_SUPABASE_URL` **and** `EXPO_PUBLIC_SUPABASE_ANON_KEY` set → `live`. Every read
  goes to the live project through the anon key, and RLS decides what comes back.
- Either missing → `fixtures`. The app runs, warns once in dev, and signs nobody in.

**Screens never branch on this.** They receive the same shapes either way (CP-001). There is no
`APP_ENV` variable in RosiFit; presence of the two public keys *is* the switch, which means there
is no way to point a build at "production config" and "test data" by accident.

---

## Binding rules

1. **Production is never an automated test target.** Not "usually not". Never — and in this repo
   that rule has teeth, because production is the *only* live environment there is.
2. **A staging deploy is a production BUILD pointed at NON-PRODUCTION DATA.** Those are separate
   questions and conflating them is how a test run reaches live customers. N/A today: no staging.
3. **Every schema change reaches production only through a migration file** in
   `supabase/migrations/`, applied to the harness first and confirmed by `bash db/harness/test.sh`.
   Never edit an applied migration. Direct edits are drift by definition — and "minor" is not an
   exemption.
4. **Schema parity is checked before backend work and again before production promotion.** The
   harness rebuilds from `000_local_shim.sql` plus every migration in order, so parity is proven
   by reconstruction rather than by comparison.
5. **Outbound messages are deny-by-default outside production**, with an explicit allowlist. See
   TEST_ACCOUNTS.md. Today this holds trivially: fixtures and harness have no SES credentials, so
   a send cannot leave either of them.

6. **Never create Supabase branches.** All schema work targets the main Supabase project
   directly. A Supabase branch is not one of the three environments above and must not become a
   fourth — it starts empty, so it proves nothing the harness does not already prove, and it
   bills by the hour for as long as it exists.

7. **Rehearsal is the local harness, and only the local harness.** Replay every migration from
   scratch against a fresh Postgres 16 and run the full spec suite (`npm run test:db`). That is
   the pre-flight check in its entirety.

8. **Production applies are gated and serial.** Show the requester the raw SQL of every pending
   migration and wait for an explicit go-ahead; then apply **one at a time, in filename order**,
   reporting the result of each before starting the next.

   Rules 7 and 8 divide the work between them, and the division matters. The harness proves a
   migration is well-formed *by reconstruction*; it cannot prove the migration is compatible with
   data that already exists, because it holds none. A migration that builds a unique index or adds
   a constraint over existing rows therefore needs that one check run against production itself,
   before it is applied — and no rehearsal environment, branch or otherwise, can stand in for it.

---

## Configuration per environment

| Variable | fixtures | harness | production |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | *(unset — this is what makes it fixtures)* | *(unset)* | set |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | *(unset)* | *(unset)* | set |
| `SUPABASE_SERVICE_ROLE_KEY` | ➖ | ➖ | Edge Function secret only |
| `PIN_PEPPER` | ➖ | ➖ | Edge Function secret only — ◻ **not yet set** |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `SES_*` | ➖ | ➖ | Edge Function secrets only |

Only the two `EXPO_PUBLIC_` values may ever be public: anything with that prefix is compiled into
the bundle and readable by anyone who installs the app (guardrail 4, `.env.example`). The rest are
set with `supabase secrets set` and appear in no tracked file.

---

## Current state of production — ◻ as recorded in `supabase/SETUP.md`, not re-verified here

- Migrations `0001`–`0014` applied; 30 tables in `public`, every one with RLS.
- Edge Functions deployed: `auth-login`, `auth-bootstrap`, `recovery-check` (public,
  `verify_jwt=false` — nobody has a session when they call them), plus `pin-issue`, `pin-reset`,
  `csv-import`, `send-followups` (JWT required).
- `app_settings` singleton seeded; **`bootstrap_completed` is still `false`** — the academy admin
  has not registered yet.
- **`PIN_PEPPER` is not set.** Until it is, every auth function returns 500. Nothing else is
  blocked: CSV import and send do not derive from it.
- Supabase advisors run and acted on — migrations `0011`–`0013`.

These marks are ◻ because they were read from `SETUP.md` during this documentation pass. Nothing
in this pass connected to the live project, by design.
