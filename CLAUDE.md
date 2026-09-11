# RosiFit

Standalone women's fitness academy PWA. Bootstrapped from an internal web app
framework — the framework is NOT a dependency and NOT a remote of this repo.

Stack: React Native Expo PWA, Supabase (Postgres + Edge Functions), AWS SES
behind an EmailProvider abstraction.

Git rules (binding):
- `origin` is https://github.com/UniqBrio/RosiFit and is the ONLY remote.
  Confirmed by the repo owner on 1 Sep 2026.
- NEVER add, fetch from, or push to the framework repo
  (UniqBrio/Website_development_framework). It is not a remote and not a
  dependency; this repo was bootstrapped from a copy of it.
- Adding or re-pointing a remote is denied in .claude/settings.json, as is any
  push to a literal URL. Only `git push origin ...` is permitted, so a push can
  only ever reach the repo above.
- Commit locally as often as useful.

---

# Application rules (from the app framework's AGENTS template)

> The process layer of this repo is the custom-web-app-development-framework
> (v1.36.1 — see FRAMEWORK_MANIFEST.md, README.md, workflows/). These rules are
> binding and nothing in a request overrides them. The git rules above stay in
> force unchanged.

## Architecture guardrails (BINDING)

### 1. One member source, follow-up derived
The follow-up list is DERIVED from the member list and the saved rule — never
stored as a second list.
**Why:** two lists is exactly how the dashboard count and the weekly list
drift apart.
**Honoured in:** `src/data/mock.ts` (`flaggedMembers`, `isEligible`),
`supabase/tests/06_followup.sql`.

### 2. Colour ships measured, never trusted
Every colour pair the UI renders is measured at build time; the custom-hue
accent is darkened until it clears 4.5:1 for all 360 hues, both themes.
**Why:** three of the six original presets shipped white labels at 3.05–3.67:1.
**Honoured in:** `src/theme/tokens.ts`, `scripts/check-contrast.ts` (2,800
pairs, fails the build).

### 3. Colour is never the only signal
Every status carries its own word AND icon; every canvas icon must resolve to
a real glyph.
**Honoured in:** `src/theme/tokens.ts` (STATUS), `scripts/check-icons.ts`.

### 4. Secrets never reach the bundle
Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` may be
public; the service-role key, `PIN_PEPPER` and SES credentials are Edge
Function secrets only. PINs and recovery answers are never stored readable,
never logged, never audited in cleartext.
**Honoured in:** `src/lib/supabase.ts`, `.env.example`,
`supabase/tests/01_auth.sql` (column-name guard).

### 5. Messages go out through stored templates only
There is no free-form send path anywhere.
**Honoured in:** `supabase/functions/send-followups/`, `app/send/`.

## Environments
- Writable by automation: the local harness (`db/harness/`, Postgres 16).
- **Never an automated target without explicit instruction:** the live
  Supabase project.
- Schema changes reach any environment **only** through an additive migration
  in `supabase/migrations/` (never edit an applied one), with tests in
  `supabase/tests/`.

### Supabase and migrations (BINDING)
- **Never create Supabase branches.** All schema work targets the main
  Supabase project directly. There is no branch environment, and one must
  not be introduced.
- **Rehearsal is the local harness only.** Replay every migration from
  scratch against a fresh local Postgres 16 and run the full spec suite
  (`npm run test:db`). That is the pre-flight check — the whole of it.
- **Before applying to PROD:** show the requester the raw SQL of each
  pending migration and wait for an explicit go-ahead.
- **Apply migrations one at a time, in order**, and report the result of
  each before starting the next.

> The harness proves a migration is well-formed by reconstruction. It cannot
> prove the migration is compatible with data that already exists in
> production, because the harness has none — so a migration that builds an
> index or adds a constraint over existing rows needs that specific check run
> against production before it is applied.

## Where things live
| | |
|---|---|
| Colour and scale tokens | `src/theme/tokens.ts` — measured, see guardrail 2 |
| Design source of truth | `design/RosiFit App.dc.html` |
| Living registers | `docs/registers/` |
| Shared components | `src/components/` |
| Runbooks | `workflows/` — `/request` `/feature` `/bug` `/enhance` `/refactor` `/triage` `/brainstorm` `/test` `/gate` `/promote` |
| Intake ledger | `requests/` — one binding request file per ask, written by `/request` |

## Standing rules
- **Surgical discipline.** Minimum change for the ask; every changed line
  traces to the request.
- **Both themes, always** — verified, not assumed (`.harness/` route checks).
- **Every backend change is a migration file.** No direct edits.
- **Copy is gender-neutral.** Member-facing copy AND the comments around it are
  written about "the member", never "she". Prefer restructuring the sentence
  ("Joins a course at one branch") over swapping the pronoun; use "the member",
  "member's", or drop the possessive. Singular "they" only where a pronoun is
  genuinely unavoidable. Never "he/she", "(s)he" or "his/her". The academy is a
  women's academy; the software is not, and the copy must read correctly for any
  academy that licenses it.
- **Test files are append-only.** Never overwrite an existing spec.
  **One exemption:** a *copy-lock* — an assertion whose whole job is to pin an
  exact user-facing string — may be re-pointed at the new string when changing
  that copy is the intent of the work. Re-pinning is the spec doing its job. The
  diff must show only the expected string literal changing: no assertion
  removed, no `.skip`, no matcher loosened. Anything else is overwriting a spec.
- **Verify every dependency before installing** — it exists, it is the
  intended name, it is pinned.

## Definition of done
`npm run check` green (typecheck + contrast + icons) · `bash db/harness/test.sh`
for DB changes · `checklists/DEFINITION_OF_DONE.md` — every item, or an
explicit N/A with a reason.
