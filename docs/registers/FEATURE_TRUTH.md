# Feature Truth

> **The canonical answer to "what does this product actually do today?"**
>
> Updated at every close-out that changes behaviour — or "no change needed" stated out loud.
>
> Every external claim about the product — website, sales material, support answer, release note
> — is sourced from **this file only**. A stale truth file is how a website ends up promising
> what the product no longer does.

> **Backfilled at framework adoption, 02-Sep-2026,** from the **30 shipped screens** under `app/`
> (32 route files less two `_layout.tsx`), read alongside `src/data/` and
> `supabase/migrations/`. Nothing here was verified against the running project: the live
> deployment has `PIN_PEPPER` unset and `bootstrap_completed = false`, so **no end-to-end flow can
> currently be executed**. Every capability below is therefore ◻ — claimed from the code, not
> confirmed against a running system — unless it is proven by a build-time gate or a SQL test,
> which are marked ✅.

**Route inventory — all 30, so the count is auditable:**

| Module | Routes |
|---|---|
| Dashboard | `(tabs)/index` |
| Members | `(tabs)/members` · `member/[id]` · `member/edit` · `match` |
| Sessions | `(tabs)/sessions` · `holiday` · `upload` |
| Weekly review & send | `(tabs)/weekly` · `send/index` · `send/review` · `send/result` |
| Courses | `(tabs)/courses` · `course/edit` · `course/rules` |
| Reports | `(tabs)/reports` |
| Staff & access | `staff/index` · `staff/add` · `staff/pin` |
| Identity | `index` · `register` · `set-pin` · `forgot-pin` · `change-mobile` · `profile` |
| Settings & support | `(tabs)/more` · `appearance` · `templates` · `audit` · `help` |

---

## Per module

### Dashboard — `app/(tabs)/index.tsx`
**Last confirmed:** 02-Sep-2026

The academy at a glance for the current week: attendance figures, the follow-up count, and a
branch selector that every other figure follows.

| Capability | Status | Notes |
|---|---|---|
| Week's attendance figures | ◻ | From `member_period_metrics` / `member_stats` — the same functions Reports reads, never a per-screen calculation |
| Academy-wide vs branch-wise scope | ◻ | Scope lives in the shell (`src/state/academy.tsx`, CP-013) because the header renders above every tab |
| Follow-up count | ◻ | Derived from the member list and the saved rule (DR-1), never a stored second list |

**Rules and validations** — picking a real branch switches the view to Branch wise; "All branches"
means academy wide. Every metric tile states the period it covers, so two tiles cannot claim
different weeks for the same numbers.

**Limits** — the dashboard reports; it changes nothing.

**Benefit** — one screen answers "who is drifting away this week", which is the entire job.

---

### Members — `(tabs)/members` · `member/[id]` · `member/edit` · `match`
**Last confirmed:** 02-Sep-2026

The member list, one member's history, the edit form, and the screen that links an unrecognised
name from an uploaded register to an existing member.

| Capability | Status | Notes |
|---|---|---|
| List, search and filter members | ◻ | |
| One member's attendance history | ◻ | |
| Edit a member | ◻ | **Her name is the only required field** |
| Several email addresses, exactly one primary | ◻ | `member_emails.is_primary` |
| Aliases | ◻ | What the uploaded register matches on |
| Link an unmatched name to an existing member | ◻ | `app/match.tsx`; branch, known display names and last-attended come from the import preview |

**Rules and validations** — **no phone number is held for a member**: it was never used to
identify anyone, so it is not collected. An alias is a correction and can be deleted; it is the
only `for delete` policy in the schema.

**Limits** — members do not sign in. RosiFit has no member-facing surface at all; every screen is
for the academy.

**Benefit** — a name spelled three ways in three registers is still one member.

---

### Sessions — `(tabs)/sessions` · `holiday` · `upload`
**Last confirmed:** 02-Sep-2026

The month calendar, closures, and the attendance register upload.

| Capability | Status | Notes |
|---|---|---|
| Month view; every session-bearing day carries an icon **and its word** | ✅ | Glyph resolution proven at build time by `scripts/check-icons.ts` (71/71) |
| Mark a session held or cancelled | ◻ | Status only — a session cannot be created or deleted from the client |
| Declare a holiday over a date range | ◻ | A **closure**, not a cancellation |
| Upload an attendance register (CSV) | ◻ | Preview then commit; the commit is server-side (`0014`, `csv-import`) |

**Rules and validations** — a holiday shows its impact **before** anything is applied, and states
out loud what it will not do. Attendance is never written by the client: `authenticated` holds no
write grant on the engine tables, so a register can only arrive through the import function.

**Limits** — no live check-in. Attendance is a register that gets uploaded, not a door sensor.

**Benefit** — closing the academy for a week does not corrupt everyone's attendance percentage.

---

### Weekly review and send — `(tabs)/weekly` · `send/index` · `send/review` · `send/result`
**Last confirmed:** 02-Sep-2026

The members the rule flagged this week, and the three-step flow that emails them.

| Capability | Status | Notes |
|---|---|---|
| The week's follow-up list, with the reason each member is on it | ✅ | Derivation covered by `supabase/tests/06_followup.sql` |
| Step 1 — choose a stored template | ◻ | |
| Step 2 — review: who receives, **and who is excluded and why** | ◻ | A member with no address is counted and named, never silently dropped |
| Step 3 — result, **per member** | ◻ | "Sent" is claimed per address, never for the batch |

**Rules and validations** — **there is no free-form composing anywhere in this flow** (DR-5). A
staff member picks a stored template; the wording is fixed and only the member's own figures are
substituted. The reason shown names the *condition* that fired, not the rule, so the row explains
itself.

**Limits** — email only; there is no SMS or chat channel. Sending needs SES credentials, which are
Edge Function secrets on the live project only.

**Benefit** — the follow-up that gets sent is the follow-up that was reviewed, and a failure names
the member instead of vanishing.

---

### Courses — `(tabs)/courses` · `course/edit` · `course/rules`
**Last confirmed:** 02-Sep-2026

The course list, the course editor, and the follow-up rule editor.

| Capability | Status | Notes |
|---|---|---|
| List and edit courses | ◻ | A course is **what** you teach, not when |
| Per-course follow-up rules | ◻ | `course_follow_up_config` |
| Live preview of who a draft rule would list | ◻ | Nothing changes until Save |

**Rules and validations** — weekdays and fees live on the *offering*, not the course; the edit
screen says so rather than collecting them. Everything in the rule editor edits a **draft**. A
configuration with both conditions off cannot exist — the toggle refuses.

**Limits** — changing course structure is admin-only (`is_super_admin()`), because it changes
every figure downstream.

**Benefit** — "missed two in a row" can mean something different for a beginners' class than for
an advanced one.

---

### Reports — `app/(tabs)/reports.tsx`
**Last confirmed:** 02-Sep-2026

Attendance over time, by branch and by course.

| Capability | Status | Notes |
|---|---|---|
| Attendance trends | ◻ | Same engine functions as the dashboard — figures cannot disagree between the two |
| Branch and course filters | ◻ | |

**Limits** — no export. Reports are read on screen.

**Benefit** — the dashboard says what is happening this week; Reports says whether it is a trend.

---

### Staff and access — `staff/index` · `staff/add` · `staff/pin`
**Last confirmed:** 02-Sep-2026

| Capability | Status | Notes |
|---|---|---|
| List staff, sorted by what still needs doing | ◻ | The two states needing action are never below the ones that do not |
| Add a staff record | ◻ | |
| Issue, regenerate or reset a PIN | ◻ | `pin-issue` / `pin-reset`, both `requireSuperAdmin()` |
| Disable access | ◻ | One boolean: `is_active = false` closes every policy at once |

**Rules and validations** — **adding a person and giving them a login are two deliberate steps.**
A record exists first; access is granted afterwards. Four access states, each with its own word
and icon: Not enabled · Awaiting PIN · Disabled · Active.

**Limits** — exactly one academy admin, enforced by the `one_super_admin` unique index. *Coach*
and *Front desk* are display labels on a staff row, **not** distinct permission tiers — they carry
identical database rights (see RBAC_MATRIX).

**Benefit** — a coach who leaves is switched off in one action, everywhere.

---

### Identity — `index` · `register` · `set-pin` · `forgot-pin` · `change-mobile` · `profile`
**Last confirmed:** 02-Sep-2026

Sign-in by mobile and PIN, first registration, PIN changes, recovery, and the profile screen.

| Capability | Status | Notes |
|---|---|---|
| Sign in with mobile + PIN | ◻ | `auth-login`; **currently returns 500 — `PIN_PEPPER` unset** |
| Register the academy admin | ◻ | `auth-bootstrap`; **not yet done — `bootstrap_completed` is `false`** |
| Set or change a PIN | ◻ | One screen, two lives: first PIN after a temporary one, or a self-change from Profile |
| Recover a forgotten PIN | ◻ | Two security questions, **three attempts, then a 30-minute lockout** |
| Change your own mobile number | ◻ | Authenticated, verified and audited |
| PINs never stored readable | ✅ | Column-name guard in `supabase/tests/01_auth.sql` |

**Rules and validations** — recovery answers are collected **up front at registration**, because
they are the only way a reset works later without a phone call. Every terminal state says plainly
what has and has **not** happened: a lockout that leaves someone wondering whether their PIN
changed is worse than the lockout itself. Changing the mobile number is cheap and safe because the
PIN derives from the immutable account id, not the phone number — so moving the number leaves the
PIN working.

**Limits** — **sign-in does not work on the live project today.** `PIN_PEPPER` is an Edge Function
secret that has not been set; until it is, every auth function returns 500 and the app says so.

**Benefit** — a coach signs in with a number she already knows and four digits, on a shared phone.

---

### Settings and support — `(tabs)/more` · `appearance` · `templates` · `audit` · `help`
**Last confirmed:** 02-Sep-2026

| Capability | Status | Notes |
|---|---|---|
| Light, dark or system theme | ✅ | Three states, persisted; the choice is the user's own (CP-016) |
| Custom accent colour, any hue | ✅ | **All 360 hues measured at ≥4.5:1 in both themes** — `scripts/check-contrast.ts`, 2,800 pairs |
| Edit email templates | ◻ | The only place message wording changes; editing or toggling one is audited |
| Audit log | ◻ | Admin-only (`audit_logs_read`); redacted by `audit_redact()` |
| Help | ◻ | |

**Rules and validations** — templates are the only way anything reaches a member. The audit log is
readable by the academy admin only, because it records staff actions.

**Limits** — the audit log is read-only and cannot be exported.

**Benefit** — the academy picks its own colour and it is *guaranteed* readable, rather than
guaranteed only on the designer's monitor.

---

## Product-wide guarantees

These hold across every screen above and are proven at build time, not asserted:

| Guarantee | Proof |
|---|---|
| Every colour pair the UI renders clears 4.5:1, both themes, all 360 custom hues | ✅ `scripts/check-contrast.ts` — 2,800 pairs, fails the build |
| Every status carries a word **and** an icon; colour is never the only signal | ✅ `scripts/check-icons.ts` — 71/71 glyphs resolve |
| The follow-up list is derived, never a stored second list | ✅ `supabase/tests/06_followup.sql` |
| PINs and recovery answers are never stored readable | ✅ `supabase/tests/01_auth.sql` column-name guard |
| No secret reaches the bundle | ✅ Only two `EXPO_PUBLIC_` values exist; `.env.example` documents the split |
| Every message goes out through a stored template | ✅ No free-form send path exists in `app/send/` or `send-followups` |

---

## Two conventions

**Marks:** ✅ means verified against the running system on the stated date. ◻ means claimed but
not yet verified — verify it the next time you touch that module and flip it, or correct it.
Never leave a claim unmarked; an unmarked claim reads as verified.

The ✅ marks above are a deliberate widening of that convention, and it should be read honestly:
they are verified by a **build-time gate or a SQL test**, not against a running deployment. Every
claim that needs a live system is ◻, because there is not currently a live system that can be
signed into. **The whole file becomes verifiable the moment `PIN_PEPPER` is set and the admin
registers** — that is the single event that unblocks it.

**On conflict, code wins.** If this file, a module document and the code disagree, the code is
the truth and **both documents are corrected in the same change**. A document that lost an
argument with reality and was left standing will win the next one.
