# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the **Audit log** — `app/audit.tsx`, reached from *More → Audit log*
  (`app/(tabs)/more.tsx:107`, `adminOnly: true`). Its data comes from `fetchAudit()`
  (`src/data/repository.ts:1121`) via `useAudit` (`src/data/hooks.ts:155`).

- CURRENT BEHAVIOUR (read in the files, 2026-09-07): a five-column table — *Action name ·
  Value existed · New value · Modified by · Modified at* — newest first, capped at 50 rows,
  one row per changed FIELD (an entry with three changes becomes three rows, the first
  carrying the action and the rest reading `same action`). It scrolls sideways as one piece
  inside the page's vertical `ScrollView`; the header row scrolls away with the body. Export
  writes a CSV of the same flattened rows.

  **Every value is printed exactly as the database stores it.** `fetchAudit` copies
  `action`, `entity_type`, `entity_id` and each `changes[].field` straight through, so the
  screen shows machine strings to a person who does not read them. In the requester's own
  screenshot: `auth.login_succeeded`, `communication.batc…`, `member.insert`; subjects that
  are raw UUIDs (`a98a2d1a-32de-45f4-8b67-6…`); field names that are column names
  (`full_name`, `joined_on`, `created_by`, `notes`, `status`); and a `created_by` value that
  is another UUID. The action column's subtitle — meant to name WHICH member or course the
  entry is about — is the `entity_id` UUID, so the one thing the reader needs (who or what
  changed) is the one thing not in words.

  Sign-in traffic is listed as ordinary content: `auth.login_succeeded`,
  `auth.login_failed`, `auth.bootstrap_completed`, `auth.recovery_passed`,
  `auth.recovery_failed`, `auth.pin_reset_requested` all reach the same table, and with a
  50-row cap they push real changes off the screen.

  There is no remarks feature anywhere in the app — `grep -ri remark` over `src/`, `app/`
  and `supabase/` returns nothing.

- DESIRED BEHAVIOUR: requester's exact words — *"the audit log is not understable to end user
  as its technical but end user is not technical person it should audit only action within
  app not login and log out. actions such as crud upload attendnace and all action within app
  even ifts modified by staff and freeze table header of audit table on scroll it should be
  visible add remarks a onother section where user can add remarks. This as senior dev and
  senior design engineer and rebuild the audit log ui making it more user friendly for end
  user"*

  Read as four changes to this one screen:
  1. **Plain language everywhere.** Every action code, entity name, field name and stored
     value the table prints is rendered as words a non-technical academy owner reads —
     `member.insert` becomes a named member added, `full_name` becomes *Name*, and an
     identifier resolves to the person or course it names (or is dropped, never shown raw).
  2. **In-app actions only.** Sign-in and sign-out activity is not listed. What IS listed:
     creates, edits, deletes, uploads/imports, attendance marking, and every other change
     made inside the app — **including changes made by staff**, not only by the owner.
  3. **Frozen table header.** The column header stays visible while the rows scroll.
  4. **A Remarks section.** A separate section on this screen where the user can write their
     own remarks.

- WHY: stated — the reader is not a technical person and the screen is technical. The log
  exists to answer *"what changed, who changed it, when"*; today it answers in column names
  and UUIDs.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Specifically —
  - **The audit record itself.** `audit_logs` stays append-only and immutable
    (`supabase/migrations/0004_audit_logs.sql`: the three `audit_immutable` triggers, the
    revoked update/delete/truncate). Nothing in this change deletes, rewrites or stops
    WRITING any audit row — including the sign-in rows, which go on being recorded and are
    only filtered out of this VIEW. No row is edited to make it readable; the translation
    happens on the way to the screen.
  - **Guardrail 4 / redaction.** PINs, recovery answers, passwords and provider keys must
    stay out of this screen, and `audit_redact` stays the enforcement. A plain-language
    layer must not name or surface a redacted field's contents.
  - **Who can see it.** `audit_logs_read` is `is_super_admin()` and the More entry is
    `adminOnly` — unchanged (see PERMISSIONS).
  - Export stays, keeps writing a real CSV file, and keeps agreeing line-for-line with what
    the screen shows.
  - The "What is never recorded" panel and its promise.
  - Every other screen. This is one surface.
  - Guardrails 2 and 3 and both themes: semantic tokens only, every status carries a word
    AND an icon, every icon resolves to a real glyph (`check-contrast`, `check-icons` green).

- ADDED DURING THE RUN (7 Sep 2026, requester's exact words): *"Also add date range
  filters in audit log and also branch filter"*. Two more controls on the same surface,
  asked for while Track B was applying, so they were taken into this file rather than
  filed as a second request — the ask is the same screen and the same run.
  - **Dates.** The shared `PeriodPanel` (This week · Last week · Last 4 weeks · This month
    · Custom range), mounted the way Reports and Attendance mount it.
  - **Branch.** The branch list from `fetchFilterOptions`, local to this screen.

- CORRECTION ROUND: 2 on this surface.

- ROUND 2 (7 Sep 2026, requester's exact words): *"the audit log in mobile view should
  also be in table format and where is remarks section new value previous value
  smodiefied at and modified by fields?"*

  **What round 1 missed, read in the files before touching anything (B1).** Not the
  layout and not the feature set - both asks were already built. Two different things
  kept them off the screen:

  1. **The table was right and undiscoverable.** Round 1 chose one table at every width
     over the cards it replaced, for a good reason that still holds: the cards dropped
     the column NAMES, which is the labelling somebody reading a log is looking for. But
     it shipped the 760pt table onto a 356pt phone window with no affordance at all -
     `showsHorizontalScrollIndicator` on a touch screen is an overlay that appears only
     once you are ALREADY scrolling. So four of the five columns sat one swipe away,
     unannounced, and the screen read as a list. Round 1's own header comment asserted
     "one table at every width" and its footnote said the table scrolls sideways - both
     true, and neither visible at the moment the reader needed them. **The miss is
     believing a statement in a footnote is an affordance.**
  2. **Remarks was rendering its error state, not its composer.** Round 1 wrote the UI,
     the repository layer, migration `0043_audit_remarks.sql` and spec `32_audit_remarks.sql`,
     and left 0043 unapplied and untracked - correctly, because CLAUDE.md forbids applying
     a migration without showing the SQL and waiting for a go-ahead. But it then closed out
     as though the feature shipped. `fetchRemarks` hit its missing-table guard and the
     section printed "Remarks are not switched on for this academy yet". **The miss is
     reporting a feature done when the half of it that lives in the database was
     deliberately not applied** - the honest close-out was "built, blocked on a go-ahead".

  **Taken this round (requester chose, 7 Sep 2026):** the sideways table STAYS - the
  requester picked "user can swipe to see data" over a stacked layout - and gains a line
  that NAMES the columns still off the edge and keeps naming them as the reader swipes.
  It is words plus a glyph, not a fade: colour is never the only signal (guardrail 3).
  It renders only when the table actually overflows, so a desktop never gets an
  instruction that does nothing. 0043 was applied to the live project on the requester's
  explicit go-ahead.

  **Rehearsal, honestly.** CLAUDE.md makes local-harness replay the whole of the
  pre-flight, and it could not run: this machine has neither `psql` nor Docker, exactly
  as OBSERVED AT INTAKE predicted. What was done instead, and it is less: the four
  objects 0043 depends on were confirmed present in production and no name collision
  was found, the migration is purely additive over an empty new table (so the
  "compatible with data that already exists" risk CLAUDE.md names does not arise), and
  the resulting shape was verified by query. `supabase/tests/32_audit_remarks.sql` has
  still never been executed anywhere. That is a real gap and it is TD, not a pass.

## CLASSIFICATION NOTE — correct this at the gate if it is wrong
Filed as **CHANGE** (Track B), not NEW and not a triage LIST. The screen ships and works;
three of the four asks restate how existing data is presented. The fourth — Remarks — is a
new capability, but it is scoped to this screen and arrives as one section of the same
rebuild, which is why it is not split into its own NEW request. If the requester wants
Remarks to be something larger than a per-screen note log (attached to individual entries,
notified, exported to others), it should be re-filed as NEW.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. Which events count as "not login and log out"?** **Taken: the whole sign-in /
  session family is hidden — `auth.login_succeeded`, `auth.login_failed`,
  `auth.bootstrap_completed`, `auth.recovery_passed`, `auth.recovery_failed`,
  `auth.pin_reset_requested`.** Kept: everything that CHANGES a stored record, including the
  account-management actions `auth.staff_created`, `auth.staff_reenabled`,
  `auth.pin_issued`, `auth.pin_changed`, `auth.pin_reset`, `auth.mobile_changed` — the
  screen's own promise is "every change to a member, course, rule, schedule, holiday, branch
  **or account**", and creating a staff account is a change; signing in is not.
- **Q2. Are the hidden rows deleted, or just not shown?** **Taken: not shown, never deleted.**
  Filtering is a view decision; the rows stay in `audit_logs` for ever. The screen says so in
  one plain line, so nobody concludes sign-ins are untracked.
- **Q3. Do remarks persist for everyone, or only on the device that typed them?**
  **Taken: persisted server-side, visible to everyone who can open the screen.** A remark
  that lives in device storage is invisible to the next person and gone with the browser
  cache, which is worse than no remark. This needs one **additive migration** for a remarks
  table plus specs in `supabase/tests/` — it must NOT be written into `audit_logs`, which is
  immutable and redacted by contract.
- **Q4. Can a remark be edited or deleted after it is saved?** **Taken: append-only, like the
  log it sits beside** — author and timestamp shown, no edit, no delete. A note that can be
  rewritten is not a record, and this screen's whole promise is that its contents cannot be
  rewritten.
- **Q5. Is a remark attached to one audit entry, or free-standing?** **Taken: free-standing —
  the requester said "another section".** Entry-level annotation is a bigger feature and is
  not what was asked.
- **Q6. Who may write a remark?** **Taken: whoever can open the screen — super admin only
  today.** The ask does not widen who reaches the audit log, and widening it would be a
  permission change nobody requested.
- **Q7. Does the export change?** **Taken: it follows the screen** — same rows, same plain
  words, sign-in rows excluded exactly as on screen, because a file that disagrees with the
  screen it came from is a second source of truth. Remarks are a separate section and are not
  folded into the audit CSV.
- **Q8. Does the 50-row cap change?** **Taken: no.** Once sign-in traffic stops consuming the
  cap, 50 rows shows materially more real activity than it does today. Paging is a separate
  ask.
- **Q10. Does the date filter narrow the QUERY or the fifty rows already loaded?**
  **Taken: the query.** The log returns the fifty most recent changes, so filtering those
  fifty would answer "what changed in August" with "whichever of the last fifty happen to
  be in August" — a different question that looks identical on screen. Narrowed in the
  query, it is the fifty most recent changes IN the period, and the footnote says so.
- **Q11. What does the date filter default to?** **Taken: no filter — "Any date".**
  Every other screen with a period opens on one because they answer "how are we doing
  lately". This screen answers "what has happened", and a default range would hide
  changes on the one screen whose promise is that nothing is hidden.
- **Q12. Where does a branch come from, when `audit_logs` records none?**
  **Taken: from what the entry POINTS AT** — a branch entry is its own branch, an
  offering carries its branch, and a member is placed by the offering she is enrolled in
  today. An entry that belongs to no single branch (a setting, a message template, an
  account) is not shown while a branch is chosen, because "at every branch" would be an
  invented fact about it. Both caveats are stated on screen, not assumed.
- **Q13. Does the branch join the shell scope Attendance uses (CP-013)?**
  **Taken: no — it is local to this screen and starts at All branches.** The shell branch
  is "which branch am I working in"; inheriting it would silently shorten an audit log
  because of a choice made two screens ago.
- **Q9. What replaces an identifier that cannot be resolved to a name?** **Taken: a plain
  fallback phrase, never the raw UUID** — the reader gains nothing from 36 hex characters,
  and the row's action, actor and time still carry the meaning.

## DESIGN SURFACE
- VISUAL?: yes — this is a UI rebuild of one screen.
- SCREENS & STATES TOUCHED: Audit log only, and all of its states: ready, loading
  (`Skeleton`), error (`ErrorState`) and empty (`EmptyState` — whose copy must still be true
  once sign-in rows are filtered: a log holding only sign-ins is now an EMPTY log, and the
  empty state must not claim nothing has ever happened). New states arriving with Remarks:
  remarks-empty, remark-composer (idle / typing / too long / submitting), remark-save-error,
  and the remarks list. No offline state on this screen; permission-denied is unchanged.
- STRINGS ADDED OR ALTERED: the requester gave no exact strings, so all of these are the
  track's to write and none may drift outside the touched area (the freeze rule):
  - The plain-language names for every action, entity and field the log can emit — the
    action set is enumerable from `supabase/` (13 `audit_log()` call sites plus 19
    `audit_row_change()` entities) and the mapping must be total, with a readable fallback
    for anything unmapped so a future action never prints as a code.
  - One line stating that sign-in activity is recorded but not listed here (Q2).
  - The Remarks section: its heading, its composer placeholder, its empty state, its save
    confirmation and its failure message.
  - The existing header, subtitle, "NA" convention and the "What is never recorded" panel
    stay unless the plain-language pass makes a specific one untrue.
- PERMISSIONS: **no.** Read stays `is_super_admin()`; writing a remark is granted to the same
  audience and to nobody else. Staff-made changes were always VISIBLE in the log and stay so
  — "even if modified by staff" is about what is listed, not about who may look.
- USAGE: `unknown` — the requester did not say how often the audit log is read or by whom,
  beyond that the reader is non-technical.
- RUN MODE: auto (default — the description says nothing about approvals). Note: the
  migration for Q3 is exempt from auto by CLAUDE.md — the raw SQL is shown and an explicit
  go-ahead awaited before it reaches PROD, and no Supabase branch is created.
- SCALE: left blank; Track B decides at B0. It will not be `micro` — a new table and a
  rebuilt table view are not a one-liner.

## OBSERVED AT INTAKE — not part of this ask
- `supabase/migrations/` jumps 0040 → 0042 with no 0041, and carries two 0038s
  (`0038_repoint_stale_course_senders.sql`, `0038_staff_write_access.sql`). Numbering only —
  flagged for the track's Definition-of-Done register pass, not to be fixed at intake.
- `db/harness/test.sh` is bash + Postgres 16; this machine is Windows and the harness has not
  been shown to run here. Track B must establish how the new migration is rehearsed before it
  is proposed for PROD — CLAUDE.md makes local replay the whole of the pre-flight check.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, produce the plan with regression risks
  (B4) — confirm mode waits for approval; auto mode (default) logs it and applies — touching
  only what DESIRED BEHAVIOUR requires. Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
