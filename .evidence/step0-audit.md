# Step 0 — every Supabase read in the app

11-Sep-2026. `src/data/repository.ts` is the whole of it: `npm run audit:boundary`
scans the 125 `.ts`/`.tsx` files outside `src/data/` and finds **zero** Supabase
queries there, so there is nowhere else to look.

**103 call sites** in total. They divide into:

| Class | Sites | Why it is not a truncation risk |
|---|---:|---|
| Reads of a table that GROWS with the academy | 30 | itemised below, every one |
| `supabase.rpc(...)` | 23 | aggregates or writes inside Postgres; `member_period_metrics` and friends return one row per subject, and a `save_*`/`delete_*`/`set_*` returns a status. None ships a list that scales with intake. |
| Writes (`insert`/`update`/`upsert`/`delete`) | 12 | a `.select()` on one of these is a RETURNING clause used to tell "wrote nothing" from "wrote one" — which is how this file detects an RLS refusal. Nothing to page. |
| Single-row reads (`.single()`/`.maybeSingle()`) | 7 | one row by definition |
| Reads of CONFIGURATION tables | 31 | `courses` (4 rows), `branches` (2), `course_offerings` (4), `offering_schedules` (6), `email_templates` (1), `app_users` (11), `app_settings` (1), `follow_up_config` (1), `course_follow_up_config` (4), `user_preferences` (3), `pin_reset_requests` (2). Set by the ACADEMY, not by its intake, and counted in tens. Production counts in `.evidence/production-read-only-findings.txt`. |

---

## The 30 reads of a growing table, itemised

Shapes: **PAGED** = `paged(…, key)` → `pageAllByKey`, keyset · **checked** =
`checked(…)` → `guardUntruncated`, the backstop for a bound that is a fact about
production rather than a number in the source · **literal limit** = `.limit(n)`
with `n` written in the source, far below 1,000, so it mathematically cannot
truncate · **upstream limit** = an `.in(ids)` whose `ids` come from a query that
carries its own literal limit.

| File:line | Table | Grows past 1,000? | Shape before | Shape after | Action |
|---|---|---|---|---|---|
| `repository.ts:213` | `members` | YES — **937 today** | offset-paged | **PAGED** by `id` | keyset |
| `repository.ts:214` | `member_emails` | YES — 705 | offset-paged, key NOT selected | **PAGED** by `id` | keyset; `id` added to the select |
| `repository.ts:215` | `member_aliases` | YES — 735 | offset-paged, key NOT selected | **PAGED** by `id` | keyset; `id` added to the select |
| `repository.ts:220` | `member_stats` | YES — 937 | offset-paged | **PAGED** by `member_id` | keyset (the PK is the FK) |
| `repository.ts:221` | `member_enrollments` | YES — 913 | offset-paged, key NOT selected | **PAGED** by `id` | keyset; `id` added to the select |
| `repository.ts:222` | `member_schedules` | YES — 0 | unpaged | **PAGED** by `id` | keyset; `id` added to the select |
| `repository.ts:857` | `member_enrollments` | YES | offset-paged | **PAGED** by `id` | keyset |
| `repository.ts:1564` | `member_enrollments` | YES | upstream limit | upstream limit | none — `ids` are the subjects of at most 50 audit rows |
| `repository.ts:1588` | `members` | YES | upstream limit | upstream limit | none — same 50 |
| `repository.ts:1655` | `audit_logs` | YES — **6,188 today** | `.limit(50)` | `.limit(50)` | none — the bound is in the source |
| `repository.ts:1786` | `audit_remarks` | YES — 0 | `.limit(100)` | `.limit(100)` | none — the bound is in the source |
| `repository.ts:1844` | `audit_remarks` | — | write | write | none |
| `repository.ts:1900` | `sessions` | offerings × 31 | unbounded | **checked** | backstop: the bound is the offering count, which nothing here knows |
| `repository.ts:2002` | `sessions` | YES — 32 | `.limit(20)` | `.limit(20)` | none — the bound is in the source |
| `repository.ts:2086` | `email_batches` | YES — 17 | `NOTIFICATION_LIMIT` | same | none |
| `repository.ts:2089` | `email_messages` | YES — 1 | `NOTIFICATION_LIMIT` | same | none |
| `repository.ts:2133` | `members` | YES | upstream limit | upstream limit | none — at most 3 × `NOTIFICATION_LIMIT` |
| `repository.ts:2182` | `email_batches` | YES — 17 | bounded by one period | same | none — batches are per send |
| `repository.ts:2192` | `email_messages` | **YES, really** | unbounded | **checked** | backstop: one batch holds one message per member it went to — the only bound here the ACADEMY sets |
| `repository.ts:2246` | `sessions` | offerings × 7 | unbounded | **checked** | backstop; feeds the `.in()` below, so it cannot itself be paged |
| `repository.ts:2273` | `attendance_records` | **YES — 3,110 in one week** | offset-paged | **PAGED** by `id` | **the read RC-039 was about** |
| `repository.ts:2286` | `members` | YES | unpaged | **PAGED** by `id` | keyset |
| `repository.ts:2364` | `sessions` | YES | unbounded | **checked** | backstop |
| `repository.ts:2373` | `attendance_records` | one member's period | unbounded | **checked** | backstop |
| `repository.ts:2395` | `holidays` | YES — 1 | upstream | upstream | none — bounded by the sessions already loaded |
| `repository.ts:2495` | `holidays` | YES — 1 | **unbounded** | **PAGED** by `id` | keyset; the newest-first sort moved client-side |
| `repository.ts:2509` | `sessions` | YES | unbounded | **checked** | backstop: the sessions one holiday covers |
| `repository.ts:2579` | `holidays` | — | write | write | none |
| `repository.ts:2602` | `holidays` | — | write (RETURNING) | same | none — `.select('id')` here tells "deleted nothing" from "deleted one", which is how an RLS refusal is detected |
| `repository.ts:3051` | `member_aliases` | — | write | write | none |

**Totals after:** 9 paged · 6 backstopped · 6 bounded by a literal limit ·
5 bounded by an upstream limit · 4 writes.

`src/data/pagedReads.test.ts` enforces the whole of this table mechanically, and
every exemption is listed IN that spec with the bound that makes it safe — so an
exemption that stops being true has somewhere to be found.

---

## What the audit found that the brief did not ask about

- **`members` is at 937 of a 1,000-row ceiling.** The next intake truncates the
  roster, the follow-up list derived from it, and every Overview count — silently,
  with `200 OK`. That is RC-039 in a different screen and it was arriving on its
  own.
- **Every primary key in the schema is single-column**, all 34. The composite-key
  row-value cursor the brief asks for has no table to be written for.
- **`audit_logs` is already 6× the cap** at 6,188 rows, and is read with a literal
  `.limit(50)`, so it is safe — but it is the clearest evidence that "no table
  here gets that big" has already stopped being true.
