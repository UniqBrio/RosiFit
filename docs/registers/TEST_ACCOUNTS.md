# Test Accounts and Data Policy

> **The standing answer to every credential prompt during testing.**
>
> Its purpose is to stop a test run pausing to ask a human a question this file already answers —
> and, more importantly, to make the *unsafe* answers impossible to reach by accident.

> **Filled at framework adoption, 02-Sep-2026.** See ENVIRONMENTS.md for what each environment is.

---

## Accounts

**There are no test accounts, and today there cannot be.** That is the honest state, and it is
more useful than a plausible-looking table of credentials that do not work.

| Account | Role | Environments | Notes |
|---|---|---|---|
| *(none)* | — | — | `bootstrap_completed` is `false` on project `lhpzhkzbnquwjljmbylo`: no `app_users` row exists yet, so there is no account of any kind to sign in as. |
| *(none)* | — | — | `PIN_PEPPER` is unset, so `auth-login`, `auth-bootstrap`, `recovery-check`, `pin-issue` and `pin-reset` all return 500. Even once an account exists, sign-in cannot succeed until the secret is set. |

**When the first account is created it will be the academy admin**, and it will be a real person's
real credential on the only live project there is. It is **not** a test account and must never be
used as one. `one_super_admin` permits exactly one, so there is no second admin to test with.

The harness environment has no accounts at all: `db/harness/` exercises policies by setting the
session role directly in SQL (`supabase/tests/01_auth.sql`), which is why the 135 assertions can
run with no credentials anywhere.

**Nothing here grants anything in production.**

---

## Fixture identities — not accounts

`src/data/mock.ts` ships five staff and a member list. These are **display fixtures**: they have
no credential, no `auth_user_id`, and exist only to draw screens when `dataSource === 'fixtures'`.

| Fixture | Purpose |
|---|---|
| `STAFF` — Sowmya Iyer, Nandhini R, Deepa Suresh, Revathi Anand, Priya Menon | one per `STAFF_ACCESS` state, so every access state can be seen on the staff screen |
| `MEMBERS`, `AUDIT`, `TEMPLATES`, … | the shapes each screen renders |

Their phone numbers are `+91`-prefixed fixture values and their addresses are fictional. Rule 1
below applies to them: if a fixture ever needs a new contact detail, it is invented, never copied
from a real person.

---

## Rules

1. **Contact details in test data are always fake.** Never a real phone number or email — not
   the developer's own, and not a test account's, used as a *customer* record.
2. **Outbound sends** go only to the pre-approved destinations listed below. **Anything else
   stops and asks.** Never a member's real address, under any circumstance.
3. **Never delete the test tenant.** Deletion flows are exercised up to the final confirmation
   and never through it — otherwise every subsequent test run starts by rebuilding the world.
   In RosiFit the harness *is* the tenant and `reset.sh` drops and rebuilds it by design; that is
   the exception, and it is safe precisely because it touches nothing else.
4. **Data inserted for a test is inserted → verified → deleted.** Zero orphans. A suite must be
   able to run twice. The harness gives each test file a **fresh database** for this reason —
   tests that share state pass or fail depending on filename order.
5. **Persistent settings are flipped and restored**, never left flipped. The next run's baseline
   is the previous run's cleanup.
6. **A database-level failure during a test run:** stop → describe → propose the migration →
   **wait for approval**. Never repair production interactively.
7. **The live project is never an automated target without explicit instruction** (CLAUDE.md,
   ENVIRONMENTS.md). There is no staging to fall back to, so this rule is the whole safety net.

---

## Pre-approved outbound destinations

| Channel | Destination | Notes |
|---|---|---|
| email (AWS SES via `send-followups`) | `support@getfit.rosifit.com` **and `support+*@getfit.rosifit.com`** | **Added 07-Sep-2026, on the repo owner's instruction, in the change that makes it reachable.** The academy's own mailbox on its own SES-verified domain. Plus-addressing is what lets fifteen member records point at one inbox without colliding on `member_emails_unique_live`. Reached only via `supabase/seed_send_test.sql`; reverse with its teardown. |
| SMS / chat | ➖ | RosiFit has no SMS or chat channel. |

**Why this row was empty until 07-Sep-2026.** It held by construction: SES credentials are Edge
Function secrets that exist only on the live project, so fixtures and harness *cannot* send.
Adding a sink address before then would have created the appearance of an approved path before
anything enforced it. The rule was to add the destination here first, in the same change that
makes it reachable — which is what the seed above did.

**A live breach of rule 1 that the seed also closes.** Before the seed, the member register held
two real personal gmail addresses as customer records, one of them not the owner's. Rule 1 says
contact details in test data are always fake; a send against that data would have reached a
person who never asked for it. While the seed is applied, no member is reachable at a real
address. **Running the teardown restores that hazard**, so the real fix is separate: those two
records need fake addresses, or consent.

**The seed is not a permanent state.** While it is applied, no member can be reached at her own
address, so the register is wrong about every member. Run
`supabase/seed_send_test_teardown.sql` when the send test is finished.

There is also no free-form send path anywhere in the product (guardrail 5, DR-5): every message
goes out through a stored template, so "what could be sent" is a reviewable list rather than
whatever a caller passes.
