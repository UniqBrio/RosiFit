# RosiFit — handoff: from merged UI to fully functional

Written 1 Sep 2026, after PR #1 merged (`a5f94ea`). For the session that
continues this work with a Supabase connector that can actually reach the
project. Read this file, `supabase/SETUP.md`, `CLAUDE.md` and
`docs/RosiFit_Implementation_Plan_V2.2.md` before writing code.

## What is DONE (do not redo)

- All 26 screens of `design/RosiFit App.dc.html` are implemented under
  `app/` — full fidelity, dark + light, custom-hue accent, verified by the
  guards below. The canvas file in `design/` is the visual source of truth.
- Database schema: `supabase/migrations/0001..0010`, verified on a real
  Postgres 16 via `db/harness/reset.sh` + `test.sh` (124 assertions).
  `supabase/apply_all.sql` is the same chain concatenated in one
  transaction for an empty project.
- Guards, all green and expected to STAY green:
  `npm run check` = typecheck (app + scripts) + `check-contrast`
  (2,800 pairs incl. all 360 custom hues) + `check-icons` (71 canvas
  glyphs). `.harness/allroutes.mjs` renders all 29 routes against
  `npx serve dist -l 8100` after `npm run export` and fails on page
  errors, empty bodies, or horizontal overflow at 420px.
- The app runs on FIXTURES (`src/data/mock.ts`) whenever
  `EXPO_PUBLIC_SUPABASE_URL` is unset — `src/lib/supabase.ts` exports
  `isConfigured`. Follow-up is DERIVED (`flaggedMembers`, `isEligible`,
  `reasonFor`) from one member list; keep that one-source property when
  swapping in live data.

## What is NOT done (the work)

1. **Apply the schema** to the Supabase project (it reported
   "No migrations"). `apply_all.sql` via MCP `apply_migration` or the SQL
   editor; verify ~30 tables in `public`, then run `get_advisors`.
2. **Edge Functions — none exist yet.** `supabase/functions/` must be
   created. Minimum set, per the plan and the RLS design (writes to the
   engine/credential tables are service-role only):
   - `auth-login` — phone + PIN → GoTrue session; lockout counters on
     `app_users`; PIN never stored/logged (pepper via `PIN_PEPPER`).
   - `auth-bootstrap` — super-admin registration incl. hashed recovery
     answers; respects the `bootstrap_completed` one-way latch.
   - `pin-issue` / `pin-reset` — staff PIN generate/reset (+ optional
     sign-out-everywhere), `must_change_pin` flow, audit rows.
   - `recovery-check` — the two security questions, 3 tries, 30-min lock.
   - `csv-import` — Meet CSV → the A–E outcomes → ATOMIC import with
     decisions and alias learning written to `audit_logs`.
   - `send-followups` — template + engine figures per member, via an
     `EmailProvider` abstraction (AWS SES impl + a dev/log impl);
     per-recipient results; excluded-not-dropped preserved.
3. **Wire the frontend** — a `src/data/` repository/hook layer that reads
   Supabase when `isConfigured`, keeping the fixtures as the fallback and
   keeping every loading/empty/error state (see `useScreenState`).
   Persist theme/accent/hue to `user_preferences` (migration 0010) as
   well as AsyncStorage.
4. **Env + deploy** — `.env` from `.env.example` (anon key + URL only;
   the service key and SES creds are Edge Function secrets, never in the
   repo or bundle — see SETUP.md §4). Set the same two EXPO_PUBLIC_ vars
   in Vercel.

## Rules that bind (from CLAUDE.md, the plan, and decisions already made)

- `origin` = https://github.com/UniqBrio/RosiFit is the ONLY remote.
- Migrations are additive; never edit an applied one. New DB work = 0011+,
  with tests in `supabase/tests/` run by `bash db/harness/test.sh`
  (needs local Postgres 16; see how this session started one in
  /var/tmp as the postgres user).
- C-82 supersession is deliberate and documented in 0010: the hue slider
  stays, guaranteed by the build-time sweep. Do not "fix" it back.
- PINs, recovery answers: never stored readable, never logged, never in
  the audit log. Emails send only via stored templates (C-68/69).
- Verify before pushing: `npm run check`, `db/harness/test.sh` for DB
  changes, and the route harness after UI changes.
