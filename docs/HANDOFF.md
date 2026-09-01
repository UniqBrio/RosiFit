# RosiFit — handoff: the app is wired to the live project

Rewritten 1 Sep 2026, after the backend session. Read this file,
`supabase/SETUP.md`, `CLAUDE.md` and `docs/RosiFit_Implementation_Plan_V2.2.md`
before writing code.

## What is DONE

**UI** — all 26 screens of `design/RosiFit App.dc.html`, dark + light,
custom-hue accent. Unchanged this session except where a screen had to gain a
real loading/error path or a live control (the CSV file picker, the email
field on outcome B, the member search on outcome E). Nothing was restyled.

**Database** — migrations `0001`–`0014` applied to project
`lhpzhkzbnquwjljmbylo`. 30 tables, every one with RLS, no table readable by
`anon`. `0011`–`0013` close what the Supabase advisors flagged; `0014` adds
`commit_csv_import()`. The local harness (`db/harness/reset.sh` +
`test.sh`, Postgres 16) passes **135 assertions**.

**Edge Functions** — deployed and in `supabase/functions/`:

| Function | JWT | What it is |
|---|---|---|
| `auth-login` | public | phone + PIN → GoTrue session; 5 tries then a 15-minute lock |
| `auth-bootstrap` | public | one-time super-admin registration, behind the `bootstrap_completed` latch |
| `recovery-check` | public | the two questions, 3 tries, 30-minute lock, then a signed token that the new-PIN step spends |
| `pin-issue` | required | add staff / issue / regenerate / re-enable — super admin only |
| `pin-reset` | required | admin resets someone else's PIN, or she changes her own |
| `csv-import` | required | preview (the five A–E outcomes) and commit (atomic) |
| `send-followups` | required | stored template + her real figures, through the EmailProvider |

All seven run with the service role, so RLS is not what protects them —
each checks its own caller (`_shared/authz.ts`).

**App** — `src/data/` reads the live project when
`EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` are set and the fixtures in `mock.ts`
when they are not. The follow-up set is still DERIVED from one member list
and the saved rule, by one implementation (`src/data/followup.ts`) shared by
both modes. Theme/accent/hue persist to `user_preferences` as well as
AsyncStorage.

**Guards, all green**: `npm run check` (typecheck + 2,800 contrast pairs +
71 icons), `db/harness/test.sh` (135), and `.harness/allroutes.mjs`
(29 routes, no errors, no overflow) after `npm run export`.

## What still needs a human

Neither can be done from a Claude session — there is no Supabase CLI or
access token there, no MCP tool for secrets or Vercel, and this session's
egress policy blocked `lhpzhkzbnquwjljmbylo.supabase.co` outright.

1. **`supabase secrets set PIN_PEPPER=...`** — see `supabase/SETUP.md` §4.
   Until it is set, the five auth functions return 500. Nothing else is
   blocked: the CSV import and the send do not touch it.
2. **The two `EXPO_PUBLIC_` variables on Vercel** — `supabase/SETUP.md` §5.

## What was NOT verified end-to-end, and why

The Edge Functions are deployed but were never *invoked* from this session:
the egress proxy refused `CONNECT` to the project host (organisation
policy), and `PIN_PEPPER` is not set, so the auth ones would have failed
anyway. What was verified against the live project instead, over SQL:

- the schema, the advisors, and every grant;
- `commit_csv_import()` end to end — outcome B matched by a confirmed alias
  with no email, outcome E creating a member and learning her display name,
  the enrolled member absent from the file recorded absent rather than
  dropped, the session completed, and the audit rows written. Run inside a
  transaction and rolled back, so the project is still empty and
  `bootstrap_completed` is still `false`.

**The first person with the CLI should**: set `PIN_PEPPER`, register the
super admin in the app, add a staff member and issue her PIN, upload a Meet
CSV through the A–E decisions, and run a send with the dev provider
(`EMAIL_PROVIDER` unset) — then check `audit_logs` has a row for each step.
That is the one path this session could not walk itself.

## Rules that bind

- `origin` = https://github.com/UniqBrio/RosiFit is the ONLY remote.
- Migrations are additive; never edit an applied one. New DB work = `0015`+,
  with tests in `supabase/tests/` run by `bash db/harness/test.sh`.
- C-82's supersession is deliberate and documented in `0010`: the hue slider
  stays, and `scripts/check-contrast.ts` sweeps all 360 hues at build time.
- PINs and recovery answers: never stored readable, never logged, never in
  an audit row. `audit_redact()` enforces it inside `audit_log()`.
- Emails go out only from a stored template. There is no free-form path in
  the UI **or** the API — `send-followups` has no subject or body parameter.
- Colour is never the only signal: every status keeps its word and its icon.
- Verify before pushing: `npm run check`, `db/harness/test.sh` for DB
  changes, and the route harness after UI changes. When an `EXPO_PUBLIC_`
  value changes, export with `--clear` or Metro will ship the old one.
