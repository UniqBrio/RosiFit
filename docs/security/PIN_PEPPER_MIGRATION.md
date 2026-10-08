# PIN pepper migration (Singapore → Mumbai)

Status: implemented on branch `feat/pin-pepper-migration`. **Not deployed.** Deploying it is a separate,
gated step (§7). Request: `requests/2026-10-08-pin-pepper-migration.md`.

## 1. Why
Staff sign in with a 4-digit PIN. The stored credential is the GoTrue password
`HMAC-SHA256(PIN_PEPPER, "pin:<app_user_id>:<PIN>")`, kept as a bcrypt hash in `auth.users`.
Super-admin recovery answers are `HMAC-SHA256(PIN_PEPPER, "answer:<app_user_id>:<normalised answer>")`
in `super_admin_recovery.answer_hash`. Production moves to Mumbai with a **new** `PIN_PEPPER`; the old
value cannot be read back. Every credential copied from Singapore was derived under the old pepper, so
Mumbai cannot check it.

Singapore's runtime still holds the old pepper. A new, **authenticated** Singapore function, `pin-verify`,
answers one question — "does this PIN, or do these answers, match?" — and Mumbai re-secures the credential
under its own pepper the moment Singapore says yes. Every PIN is kept. No secret ever leaves the project
that holds it. This affects staff only (11 accounts); members have no PIN.

## 2. Components
| Piece | Where | Role |
|---|---|---|
| `0091_pin_pepper_version.sql` | Mumbai DB only | `app_users.pin_pepper_version`, `super_admin_recovery.pepper_version`: smallint NOT NULL DEFAULT 0. 0 = old pepper, 1 = Mumbai's. Additive; no credential touched. |
| `_shared/pinVerifyProtocol.ts` | both | The signed request/response contract (pure). |
| `pin-verify` | **Singapore only** | The verifier. Read-only on application tables; answers one word. 404 anywhere else. |
| `_shared/pinVerifyClient.ts` | Mumbai | Signs and sends the request; fail-closed. |
| `auth-login`, `recovery-check` | Mumbai | Version 1: local check. Version 0: ask Singapore once, re-secure, mark 1. |
| `_shared/identity.ts` (`rotatePin`, `createAuthIdentity`) | Mumbai | Every PIN Mumbai sets (pin-issue, pin-reset, recovery apply, bootstrap, the re-secure) is marked 1. |
| `auth-bootstrap` | Mumbai | New recovery answers stored as 1. |
| `supabase/reports/pin_pepper_coverage.sql` | Mumbai | Read-only coverage (counts and names only). |

## 3. Server-to-server authentication (pinVerifyProtocol.ts)
- **Secret:** `PIN_VERIFY_KEY` — a NEW random value (at least 32 random bytes, hex or base64url), set once on
  **both** projects as an Edge Function secret. It is never in the repo, a log, a response, or the browser.
  Existing Singapore secrets are not touched.
- **Request:** `POST https://lhpzhkzbnquwjljmbylo.supabase.co/functions/v1/pin-verify` (a constant — the
  caller cannot be pointed elsewhere), `redirect: 'error'`, 8-second timeout. Body:
  `{"v":1,"kind":"pin","app_user_id","pin","ts","nonce"}` or `{"v":1,"kind":"recovery","app_user_id","answers":[{question_id,answer}],"ts","nonce"}`.
- **Signature:** header `x-rosifit-signature` = hex `HMAC-SHA256(PIN_VERIFY_KEY, "rosifit-pin-verify/v1\n" + <exact body>)`.
  It is checked over the raw bytes in constant time **before** the body is parsed.
- **Freshness:** `ts` must be within ±60 s; a `nonce` already seen by that isolate is refused.
- **Refusals carry no body:** unsigned / forged / stale / replayed → 401; key not configured → 503; not
  Singapore → 404; not POST → 405.
- **Response:** exactly `{"result":"valid"|"invalid"|"locked"|"disabled"|"not_found"}`. The client rejects
  anything else (extra fields, other values, non-200) as `unavailable`.
- `verify_jwt = false` for `pin-verify`: the caller is another project's server with no session there; the
  HMAC is the door. Gateway JWT checks are unchanged for every other function.

## 4. Flows
**Sign-in (auth-login)** — unchanged up to and including Mumbai's own lock (`locked_until`) and
disabled (`is_active`) checks, which run FIRST, so neither can be bypassed.
| `pin_pepper_version` | What happens |
|---|---|
| 1 | Local sign-in under Mumbai's pepper — exactly as before. Singapore is never contacted. |
| 0 | `pin-verify` (kind `pin`). **valid** → `rotatePin` under Mumbai's pepper (marks 1) → local sign-in → Mumbai session. **invalid / not_found** → the existing wrong-PIN path (counted, may lock, audited). **locked** → 423. **disabled** → 403. **unavailable** → 503, *not* counted, nothing changed. |
The session returned to the browser is always Mumbai's. Singapore's verification session is ended by
the verifier before it answers, and never leaves Singapore. A re-secure is audited as
`auth.login_succeeded` with `metadata.pin_rekeyed = true`.

**Recovery (recovery-check `verify`)** — Mumbai's recovery rate limit runs first, unchanged. Answers to
version-1 questions are checked locally. If every local one matches, version-0 answers go to `pin-verify`
(kind `recovery`) once: **valid** → re-hashed under Mumbai's pepper and marked 1, then the existing success
path issues Mumbai's own recovery token. **invalid** → the existing failure path (counted). **locked** →
423. **unavailable** → 503, not counted. Questions not answered this time stay at 0.

**PIN issue / reset / recovery apply / bootstrap** — set the credential directly under Mumbai's pepper via
`rotatePin` / `createAuthIdentity`, which mark version 1. Singapore is never involved.

## 5. Lockout interplay
| Situation | Result |
|---|---|
| Mumbai has the account locked or disabled | Refused by Mumbai before any call to Singapore. |
| Wrong PIN, version 0 | Singapore says `invalid`; Mumbai counts the attempt and locks after 5 (15 min), as today. |
| Singapore has it locked or disabled (its frozen copy) | Mumbai refuses (423 / 403). Nothing is migrated or counted. |
| Singapore unreachable or misconfigured | 503, nothing migrated, nothing counted, credential unchanged. Fail closed. |
| Wrong recovery answer, version 0 | Mumbai's recovery limit counts it (3 attempts, then 30 min), as today. |
The verifier itself counts nothing and writes nothing to Singapore's application tables. Mumbai is the
only counter, so a person is never double-penalised and Singapore's frozen data stays frozen. Only the
caller holding `PIN_VERIFY_KEY` can reach it; every attempt therefore passes through Mumbai's lockout.

## 6. What leaves a trace on Singapore
Only Supabase Auth's own records of one verification sign-in (session created and deleted,
`last_sign_in_at`, Auth's internal audit). No `public` table is written, so the cutover reconciliation
(R9, which reads `public` only) sees nothing.

## 7. Deployment (later, each step separately approved)
1. Generate `PIN_VERIFY_KEY` **once** (≥32 random bytes) and set the same value on Mumbai and, as a new
   secret, on Singapore. Never print it. Confirm by digest that both match.
2. Deploy `pin-verify` to **Singapore only** (`verify_jwt = false`). Check, writing nothing: an unsigned POST →
   401 with no body; a GET → 405.
3. Mumbai rehearsal DB: apply `0091` (needed for Preview testing; the reset removes it again).
4. Deploy to **Mumbai**: `auth-login`, `recovery-check`, `auth-bootstrap`, `pin-issue`, `pin-reset` (all five
   bundle the changed `_shared` code). Never deploy `pin-verify` to Mumbai — it would answer 404 anyway.
5. Preview test: one real staff sign-in → `pin_pepper_version` 1 (coverage report), then a second sign-in
   with no Singapore call.
6. Cutover: final restore → R8 → **apply 0091 before unfreeze.** The new functions read
   `pin_pepper_version`, so between restore and 0091 Mumbai sign-in errors. That window sits inside the freeze.
7. Watch `pin_pepper_coverage.sql`. When it says `t t`, delete `pin-verify` from Singapore and unset
   `PIN_VERIFY_KEY` on both. Anyone still at 0 after Singapore is retired gets a PIN re-issue (`pin-issue`).

**Never redeploy these changed functions to Singapore**: Singapore's DB has no `pin_pepper_version` column.
Singapore keeps the versions deployed today (B4).

## 8. Rollback and failure
- Before cutover: nothing here is live. Deploying `pin-verify` to Singapore is reversible by deleting it.
- After cutover, rolling back to Singapore: Singapore's credentials were never changed, so every PIN that
  was valid there still is. A PIN *changed* in Mumbai (pin-reset or recovery) is not known to Singapore.
- If Singapore is unavailable: version-0 staff cannot sign in until it returns, or until an admin re-issues
  their PIN. Version-1 staff are unaffected.
- If `rotatePin` succeeds but marking version 1 fails, the request fails. The next sign-in re-secures again
  (same PIN). Nothing fails open.

## 9. Residual risks
- The PIN crosses Mumbai → Singapore over TLS, server to server, once per account. That's the same exposure
  as the person signing in to Singapore today. It is never logged, stored or audited.
- The replay guard is per isolate. A captured request (it would need TLS broken) replayed inside 60 s to
  another isolate returns the same one-word answer and changes nothing.
- Singapore must stay **active** until coverage is complete (free projects pause after ~7 days idle).
- Singapore's existing public `auth-login` and `recovery-check` are unchanged and remain what they are
  today. This work adds no new unauthenticated surface.
