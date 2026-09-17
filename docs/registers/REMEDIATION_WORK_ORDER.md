# RosiFit — Remediation Work Order v2

**Date:** 17 September 2026. Supersedes v1 (which was built on the register alone).

**Evidence base (five documents, cited by prefix):**

| Prefix | Document | Nature |
|---|---|---|
| `RV-nn` | Repository Verification Register, 17-Sep-2026, commit `563d779` | Repo-verified, read-only. 41 findings. |
| `A:` | Application Bug, Gap & Implementation Audit (`K-`, `F-` IDs) | Static audit with file:line refs. `npm run check` executed. |
| `B:` | Second audit (`F-`, `C-`, `S-`, `T-` IDs) | Static audit with file:line refs. One spec executed. |
| `C:` | Future Failure-Mode & Scale Audit (`RF-` IDs) | Static audit + Supabase platform limits from documentation. |
| `FR` | 0073 fix report | Wrote `0073_alias_unique_per_member.sql`; **read production catalogue read-only**. |

`A:F-06` and `B:F-06` are different findings — the two audits collide on the `F-` prefix. Always carry the letter.

---

## 0. Decisions taken (do not re-open)

These were the open calls. They are decided. Record each in `docs/decisions/` as a `DECISION_LOG` entry when the gate that uses it lands.

**D-1 — Feature freeze until Gate 2 exits.** No new feature work ships until `npm run check` and `npm run test:db` are green, required on `main`, and gating the Vercel deploy. Rationale: daily new errors are not four bugs; they are the direct consequence of a dead verification layer (RV-02, RV-03, RV-20, RV-21, A:F-09, A:F-10, A:F-11, A:F-12, B:T-01..T-06). Every change shipped through a red pipeline is indistinguishable from the failures already in it. Hotfixes in Gate 1 are the only exception, and each goes through the harness first.

**D-2 — `supabase/tests/04_members.sql:37, :40, :58` are re-pointed under the copy-lock exemption.** Migration 0071 deliberately changed the uniqueness rule and documents why; `48_duplicate_is_per_course.sql:209-213` already asserts the new rule. A test asserting the rule 0071 removed is a stale lock. The diff must show only the three string literals changing — no assertion removed, no `.skip`, no matcher loosened (RV-02). The FR author's hesitation was about authority, not correctness; the owner has now given it.

**D-2a (17-Sep-2026) — D-2 assumed the literals were the failure; `t.rejects` fails on the accepted path, so the statements are.** 0071 dropped both indexes and nothing refuses those three inserts any more (`db/harness/assert.sql:20-35` only reads the match string on the exception path). `:37`/`:40` are re-pointed to the surviving per-member uniqueness, 0073's `member_aliases_member_name_unique`, by inserting the duplicate for `RF-000118` — the member who already holds `'Shazia'` — three literals each. `:58` is inverted to an acceptance plus a `t.ok` naming `refuse_course_duplicate` as where the address rule went (cross-ref `48_duplicate_is_per_course.sql:209-213`) — an authorised one-line spec rewrite — until T-062 restores an address refusal by trigger, at which point `:58` returns to `t.rejects`. T-011 therefore depends on 0073 being in the harness replay.

**D-3 — 0073 is applied as written, via `supabase db query --linked -f`, not `db push`.** Rationale: RV-19 (duplicate version prefixes `0038`×2, `0044`×3, `0045`×2, `0057`×2, `0041` missing) makes the remote ledger unreliable for `db push`. Do **not** renumber already-applied migrations — that rewrites history the ledger already holds. Instead: apply by file, then `supabase migration repair --status applied 0073`, and add the collision check (Gate 2) so no new duplicate is ever committed. Apply only after Gate 1 rehearsal passes.

**D-4 — Evidence tiers govern what becomes a work item.**
- **Tier A** — in the RV register: a work item, cite `RV-nn`.
- **Tier B** — audit finding with file:line evidence, corroborated by a second audit *or* by an FR production read: a work item, cite both.
- **Tier C** — single audit, no line ref, or marked *Strongly Suspected* / *Needs Verification*: goes to §6 (verify before acting), never straight to code.

**D-5 — Two v1 retractions are reversed.** v1 deleted the `recompute_member_stats()` cascade and the unpaged `member_period_metrics` RPC as unsupported. They were unsupported *by the register*. Both are Tier B (three audits each, matching line refs) and are now Gate 1 items. The v1 objection stands only against the embellishments, which stay deleted (§2).

**D-6 — Communication policy for repeat sends (RV-31): server-side refusal, with an explicit `resend: true` override flag on the request.** A second send to the same member for the same period is refused unless the caller passes the flag; the UI exposes it as a deliberate "Send again to N members already written to" confirmation. Rationale: fail closed. The owner can relax this later; it cannot un-send an email.

**D-7 (17-Sep-2026) — Gate 1 exits on the specs it owns, not on the whole suite.** The first executed `db-harness` run (#82, 11-Sep) found the SQL suite 16 files red; on the 0071 commit (#99) 19; on today's `main` (#104) 18 of 56, 776 assertions passing, migrations replaying clean. It was never one stale lock — it has been red at every point CI could see it, and "`npm run test:db` fully green" is therefore Gate 2's exit next to `npm run check` green, where the other seventeen files are triaged (T-110 group and the regression rows split from it). Gate 1 exits on 0073 applied and verified, and on `04`, `51` and each Gate 1 row's own spec file green in the `db-harness` job.

**D-8 (17-Sep-2026) — "Never edit a historical file" means an applied one.** A migration absent from every ledger and executed only by the from-scratch harness is a draft and is corrected in place. 0073 was corrected under this rule on 17-Sep before first apply (T-111: as written it restated `merge_member_into` from 0032 and would have reverted 0061's in-place edits).

---

## 1. Corrected problem statement

Three problems, in the order they must be fixed.

**Problem 1 — the verification layer is dead. This is the root cause of "errors every day."**
- `npm run check` red on `main`: 1,628 / 1,619 / 9 fail (RV-03, A:F-09). `.gate-logs/G7.log` recorded 7 failures at the last gate run; it is now 9 (A:F-09).
- `npm run test:db` not run since 0071; the two SQL tests that exercise `add_as_new` would have caught RV-01 (A:F-01, B:T-01, FR). `psql`/`docker` absent on the dev machine, so the harness only runs in CI — and nobody reads that job (RV-40, A:F-10).
- Of 13 gates, G1/G2/G3 crash on a missing `design/tokens.json`, G5 logs nothing, G6 blocked (ESLint configured, not installed), G8 runs a script that does not exist, G10/G13 inert, `conformance.json` all BLOCKED. There is no DB gate (A:F-10).
- `tsconfig.json` excludes `supabase/`, `scripts/`, `**/*.test.ts` — every Edge Function and every spec untypechecked (RV-21, A:F-11).
- Vercel builds on push with no `ignoreCommand`; red CI does not stop a deploy; no post-deploy smoke (RV-20).
- The guard specs that hold the two historical fixes shut are scoped to the file that failed last time: `requestSize.test.ts` `MUST_CHUNK` has two entries; `edgeFunctionPagedReads.test.ts` pins `FN = 'supabase/functions/csv-import/index.ts'`; `pagedReads.test.ts` scans `supabase.from(` and never `supabase.rpc(` (RV-27, RV-28, B:T-02, B:T-03, C:L).
- 19 browser checks in `.harness/` wired to no script, no gate, no CI job; no runtime test of any of the 33 screens (A:F-12).

**Problem 2 — a correctness break at N = 1, confirmed live in production.** 0071 dropped `member_aliases_unique` (`0071:115`). `commit_csv_import` (`0045:206, :227`) and `merge_member_into` (`0032:156`) still carry `ON CONFLICT (alias_type, alias_normalized)`. `ON CONFLICT` infers an index, not a rule → `42P10`, whole transaction rolls back (RV-01, A:F-01, B:F-01). **FR read production:** `member_aliases_unique` absent, `member_aliases_lookup` `indisunique=false`, `pg_get_functiondef` shows the stale clause in exactly those two functions, byte-identical to the repo. Commit `5e361de` is titled "0071 is live." **RV-39 is therefore answered: attendance import is broken in production now.** Not a scale problem — fires on the first non-exact name, which `autoDecisions` (`app/upload.tsx:91-108`) maps to `add_as_new` for every `possible`, `ambiguous` and `unmatched` row.

**Problem 3 — work that scales with the academy, not the request.** Three independent ceilings:
- **Transaction duration.** `commit_csv_import` calls `expected_members_for_session()` once per file row, appends to a plpgsql array per row (O(n²)), and finishes with `recompute_member_stats()` **unscoped** — every member, `current_streak_for()` over each one's full history — inside one transaction against `statement_timeout` (8s documented default for `authenticated`; `service_role` has none set and inherits `authenticator`'s) (C:RF-01, A:F-06, B:F-07). Same unscoped call in `update_member` `0027:304` and `create_member` `0026:406` (A:F-06). Migration 0035 fixed this for `set_attendance` and wrote down why; 0047/0056/0057/0064 pass `v_members`. The import path was never swept.
- **PostgREST row cap on RPCs.** `member_period_metrics` returns one row per member and is read unpaged and unguarded at `repository.ts:229` (`fetchMembers`), `:1953` (`fetchBucketMetrics`), `:1977` (`fetchWeekRows`). Members past row 1,000 fall to `metric?.expected ?? 0` → zero on the card, zero `missed`, cannot be flagged for follow-up; totals under-report (A:F-02, B:F-02). RV-34's FIXED verdict covers `supabase.from(` table reads only; the RPC is outside it. The academy passed 1,000 live members on 12-Sep-2026.
- **Edge Function bounds.** `send-followups` reads `members`, `member_enrollments`, `member_emails`, `member_stats` with unchunked, unpaged `.in()` (`index.ts:108, 113, 152, 155`) — 640 ids through, 660 refused, measured 16-Sep-2026 (RV-05, B:F-03, C:RF-03). Serial per-recipient loop: 1 metrics RPC + insert + SES + update + `member_stats` update, one open browser request, 150s/400s wall clock (RV-07, RV-11, C:RF-04). `client_batch_id` never sent by any caller (RV-06, A:F-05, B:F-05, C:RF-05).

---

## 2. Claims that stay deleted, and what replaces them

| v1 draft claim | Status | Replacement |
|---|---|---|
| `recompute_member_stats()` recalculates "1,150+ members **1,000 times** per import, causing **query lock timeouts**" | Embellishment deleted; **finding reinstated** | Runs **once** per commit, over every member, inside the transaction; ceiling is `statement_timeout`, not locks. Lock contention is a secondary effect: two writers serialise on `member_stats` (C:RF-01, A:F-06). |
| "~2.4M string comparisons **exceed CPU limits and crash**" | Deleted | Cost is O(rows × members) with per-comparison allocation (RV-26, A:F-07, B:F-12, C:RF-02). Edge CPU limit is 2s/request per Supabase docs (C:§3). Crash is *Strongly Suspected*, not measured → §6. |
| "At 500+ recipients the function **exceeds** wall-clock and terminates" | Deleted as stated | Wall clock is 150s free / 400s paid (C:§3, documented). C models 456 recipients at 2.5–5 min. Treat as *likely at today's scale, measure before quoting* → §6. |
| "Dashboard metrics RPCs lack keyset pagination" | **Reinstated, narrowed** | Exactly one RPC, three call sites (§1 Problem 3). Not "dashboard-wide"; not table reads (those are RV-34 FIXED). |
| "Members 1,001+ processed as 0 attendance" | Split | Two mechanisms: (i) `member_period_metrics` truncation → `?? 0` fallback (A:F-02); (ii) `send-followups` truncation → `excluded / Member not found` (RV-05); (iii) discarded read errors → false zeros incl. inside a sent email (RV-18). Cite the right one per path. |
| `[cite: 1, 2, 4]` | Deleted | Cite `RV-nn`, `A:`, `B:`, `C:`, `FR` with the source's file:line. |

---

## 3. Gate 0 — remaining read-only verification

FR has already settled RV-39 (see §1). What is still unread; every item is a read:

| # | Read | Settles | Source |
|---|---|---|---|
| 0.1 | GitHub Actions run history for `main` — are `gate` and `db-harness` red, green, or not running? | RV-40. If green, something is not running what it claims — worse than red. | RV-40 |
| 0.2 | `select id, created_at, requested_count, sent_count from email_batches where status = 'processing'` | RV-41. Emails may have gone out under a batch reporting `sent_count 0`. | RV-41, C:RF-06 |
| 0.3 | `select status, count(*) from email_messages group by 1` | Rows stuck in `sending` = a killed send already happened (B:F-14). | B:unknown 5 |
| 0.4 | Is **0072** applied? `fetchMembers` already selects `active_again_from` (`repository.ts:220`); `0072_member_active_again_from.sql` appears untracked in `.gate-logs/last-tree.txt`. If unapplied, the member list read fails outright. | Not in RV register. | B:unknown 8 |
| 0.5 | `select rolname, rolconfig from pg_roles where rolname in ('authenticated','service_role','authenticator')` | The real import ceiling for C:RF-01. | C:§20 #2, A:V-4 |
| 0.6 | `select count(*) from member_period_metrics('<week_from>','<week_to>')` for the current week | Whether A:F-02 / B:F-02 is firing today. ≥1,000 = live now. | B:unknown 4 |
| 0.7 | `select status, count(*), max(completed_at) from csv_imports where created_at > '2026-09-16' group by 1` | Has any import succeeded since 0071? If everything is `previewed`, Problem 2 has been live since the 16th. | B:unknown 3 |
| 0.8 | Re-run 0073's duplicate-group count immediately before apply | FR read 0 today; the register warns it can age. | RV-01, FR |
| 0.9 | `get_advisors(type: 'performance')` via Supabase MCP, read-only | Confirms C:RF-07 (`auth_rls_initplan` lint) and index gaps. | C:§20 #4 |

**Exit:** all nine recorded with timestamps in `docs/registers/`. No production assertion is made anywhere before its read.

---

## 4. Gate sequence

Order rationale: Gate 1 stops the bleeding with the smallest possible change set, each rehearsed in CI. Gate 2 is the permanent fix — it turns the pipeline back on and widens every guard to class scope, so Gates 3–6 land through a gate that can fail. D-1 freeze runs from now until Gate 2 exits.

### Gate 1 — Stop the bleeding (this week)

Each item ≤ one working day for one person. Each is rehearsed by the CI `db-harness` job before anything touches production. Nothing else ships.

**1.1 — Make the harness able to pass.**
- Re-point `04_members.sql:37, :40, :58` per D-2 (RV-02).
- Get the `db-harness` CI job actually running `npm run test:db` on a Postgres 16 runner and read its output. This *is* the rehearsal; the dev machine cannot do it (FR, RV-40).

**1.2 — Apply 0073 (Problem 2).** RV-01, A:F-01, B:F-01, FR.
- 0073 as written by FR: guard that refuses if any `(member_id, alias_type, alias_normalized)` group has >1 row; `create unique index member_aliases_member_name_unique`; re-emits `commit_csv_import` and `merge_member_into` with `on conflict (member_id, alias_type, alias_normalized) do nothing` at `0045→0073:145, :166` and `0032→0073:107`; byte-identical otherwise. Ships with `supabase/tests/51_alias_unique_per_member.sql` (TESTs 1–9, including an in-database assertion that no function still infers the dropped index) and `src/data/aliasConflictTarget.test.ts`.
- FR warns: **every line of 0073 and 51 is unexecuted** — never parsed by Postgres. Expect adjustment on first harness run. Do not skip 1.1.
- Apply per D-3. Verify: index exists and `indisunique=true`; `pg_get_functiondef` scan returns 0 stale targets; one real upload.
- Known fallout FR names, tracked not fixed here: `addMemberAlias` (`repository.ts:3263`) no longer refuses a name held by another member — `aliasClaimedMessage` wording ("already belongs to another member") now misreads for a same-member duplicate. `supabase/apply_all.sql` is a stale pre-0071 snapshot. Both → Gate 6.

**1.3 — Scope the import's stats recompute (Problem 3, transaction ceiling).** C:RF-01 A+B, A:F-06, B:F-07. New migration `0074`, additive, re-emits `commit_csv_import` from 0073's body:
- `perform public.recompute_member_stats(v_present_ids || v_expected_ids)` instead of `recompute_member_stats()` — the function already accepts `p_member_ids uuid[]`; five other migrations already do this (0035, 0047, 0056, 0057, 0064).
- Hoist `expected_members_for_session(v_session_id)` above the row loop into `v_expected_ids` — it is already computed once *after* the loop for the override; compute it once *before* and use it in both places.
- Same scoping in `update_member` (`0027:304`) → `array[v_member_id]`, and `create_member` (`0026:406`).
- Leave the O(n²) `array_append` / `= any()` for Gate 3 unless the 2,000-row harness timing (Gate 2.9) says otherwise.

**1.4 — Turn the silent zeros into a visible failure (Problem 3, RPC cap).** A:F-02, B:F-02 stopgap. Wrap the three `member_period_metrics` call sites (`repository.ts:229, :1953, :1977`) in `checked('period metrics', …)` and route the error through `fail()` so a truncated read throws a person-readable sentence instead of zeroing members. The proper fix (server-side `period_totals()` for the two summing callers; keyset `p_after_member_id` for `fetchMembers`) is Gate 3.

**1.5 — Stop duplicate mass mail, three one-liners.**
- `client_batch_id`: make it required in `src/data/api.ts:269`; mint with `useState(() => crypto.randomUUID())` when the draft opens in `app/send/index.tsx:225` and `app/member/[id].tsx:278`; pass on every retry. Turn the 409 into "this send is already in progress — here is what it did" (RV-06, A:F-05, B:F-05, C:RF-05).
- Send screen `failed` gate: add `already.state === 'error'` (`app/send/index.tsx:206-207`); make `defaultSelection` (`src/data/sent.ts:92`) return **empty** when `sent` is unknown. Failing safe here means ticking nobody, not everybody (B:F-06, C:RF-08).
- `send-followups/index.ts:282`: check the insert error and fail *that recipient*; remove the three `!` non-null assertions (RV-10).

**1.6 — Stop the PWA reload mid-operation.** Module-level in-flight flag set by send, stage/commit and the bulk importers; `reloadWhenIdle` consults it alongside idle and `hidden` (RV-30, C:RF-20). Playwright-verified when Gate 2.6 lands; ship the flag now.

**Exit (amended by D-7):** 0073 applied and verified; `04`, `51` and each Gate 1 row's own spec file green in the `db-harness` job; 0074 applied and verified; an import with one new name succeeds end to end; a send retried with the same `client_batch_id` delivers nothing twice; `member_period_metrics` at ≥1,000 rows throws rather than zeroes.

### Gate 2 — Turn the verification layer back on (permanent fix; freeze lifts at exit)

**2.1 — `npm run check` green.** Re-point the nine (RV-03, A:F-09): `formDropdownMenu.test.ts:148` is a **real regression** — `app/(tabs)/courses.tsx:7` imports `DropdownRow/Field/Panel/List` and renders none; the list-screen filter rule is violated (A:F-28) — fix the code, not the test. `memberJoinedOn.test.ts:141` is a brittle `src.slice(at, at+600)` window; widen it (A:F-40). `message.test.ts:115, :149, :300, :322, :363` (14th token) and `rosterFilter.test.ts:65, :201` (Active/Inactive, R-001) are copy-locks — re-point, confirming each still pins a rule.

**2.2 — Required checks and deploy gating.** `gate` and `db-harness` required on `main`. Vercel `ignoreCommand` consulting the CI result, or deploy from CI. One post-deploy smoke check; the `post-release-monitor` agent exists — schedule it (RV-20, A:§10).

**2.3 — Typecheck everything.** Second tsconfig for the Deno tree or `deno check supabase/functions/**/*.ts`, wired into `npm run check`. Remove `**/*.test.ts` from the client exclude. **Do not** just remove `supabase/` from the client tsconfig (RV-21, A:F-11).

**2.4 — Widen the three guard specs from site to class.** This is what stops the *next* instance rather than the last one (RV-27, RV-28, B:T-02, B:T-03, C:L).
- `requestSize.test.ts`: enumerate every `.in()` in `src/**` **and** `supabase/functions/**`; each either goes through `inChunks` or sits in a `BOUNDED` list with a written reason.
- `edgeFunctionPagedReads.test.ts`: walk every file under `supabase/functions/`, not `FN` = one file.
- `pagedReads.test.ts`: also scan `supabase.rpc(`; every set-returning RPC is paged, bounded, or exempted with a reason.
- Add a rule: an index is never dropped without a `pg_proc.prosrc` grep for `ON CONFLICT` naming its columns (A:§12 Phase 4). FR's `aliasConflictTarget.test.ts` is the seed.

**2.5 — Migration ledger safety.** Prefix-collision and gap check in `reset.sh` or a CI audit script; run fail-first — must name `0038`, `0044`, `0045`, `0057` and the `0041` gap (RV-19, A:F-19). Document the four as known, applied lexically, never to be renumbered (D-3). Same for test prefixes `30`, `34`, `48`.

**2.6 — Repair or delete the inert gates** (A:F-10). G1/G2/G3: either supply `design/tokens.json` or retire them (RosiFit uses `src/theme/tokens.ts`). G6: install ESLint, add the `lint` script and CI step, fix the stale comments in **both** `.github/workflows/ci.yml` and `ci/github-actions-ci.yml` (RV-22). G8: point at a real script or delete. G10/G13: fixtures or delete. Wire at least three of the 19 `.harness/` browser checks into CI — the app's first runtime tests (A:F-12).

**2.7 — Add the DB gate.** `npm run test:db` as G14. The migration rehearsal `CLAUDE.md` calls "the pre-flight check — the whole of it" is currently not a gate anywhere a person looks.

**2.8 — `supabase/config.toml`** with `[functions.<name>] verify_jwt` for all eleven functions, plus a spec asserting every directory has an entry. `ses-feedback` and `unsubscribe` must be public; `csv-import` and `send-followups` must not (RV-17, A:F-20). One `supabase functions deploy` with the wrong default breaks sign-in or exposes a function; this has already happened once (`SETUP.md:180`).

**2.9 — Seed a scale fixture in the harness.** `seed_scale.sql` at 500 / 2,000 / 5,000 members with a year of attendance and realistic name density (A:§12 Phase 4, C:§23 Phase 0). First use: time `commit_csv_import` at 2,000 rows before and after 1.3. This is the single measurement C says would most change its conclusions.

**Exit:** `npm run check` green and `npm run test:db` fully green (all 56 files — D-7); both CI jobs green and required; deploy blocked on red; Edge tree typechecked; all three guard specs class-scoped and proven to fail closed (add a bad `.in()` in a scratch branch, watch the build break, remove it); DB gate in place; `config.toml` committed; scale fixture runs. **D-1 freeze lifts.**

### Gate 3 — Bounded reads and RLS cost

- **RV-05 / B:F-03 / C:RF-03:** port `inChunks` + `MAX_IDS_PER_REQUEST = 150` into `supabase/functions/_shared/pageAll.ts`; route all four `send-followups` reads (and the fifth, `course_offerings .in('id', offeringIds)`, B:F-03) through `pageAllByKey(inChunks(...))`; **every one throws on error** — four of five currently discard it. Keep 150; it is deliberately portable, not cliff-minus-margin (RV-35).
- **A:F-02 / B:F-02 proper:** `period_totals(p_from, p_to)` returning one row for `fetchWeekRows` and `fetchBucketMetrics`; keyset `p_after_member_id` on `member_period_metrics` read through `pageAllByKey` with `key: 'member_id'` for `fetchMembers`.
- **C:RF-07:** one additive migration re-creating the 47 RLS policies with `(select public.is_active_app_user())` (and `is_super_admin()`, `is_subscription_writable()`). Behaviourally identical — 0013 says so for the two it fixed. Verify with 0.9 (`auth_rls_initplan` lint clears) and extend `09_grants.sql` to assert no bare helper call remains.
- **C:RF-13:** `offering_schedules` is read whole and unguarded in `fetchCourses`, `fetchOfferings`, `fetchBranchUsage`; it grows with time and edits, not members, and truncating it changes who is expected → who is flagged → who is mailed. Filter to the version in force server-side, or at minimum `checked()`.
- **C:RF-09 / A:F-25:** `TruncatedReadError` bypasses `paged()`'s translation and renders a developer sentence to the operator (CP-003 violation). Catch and translate in `repository.ts`. Then aggregate the three reads that throw at 1,000 — `fetchCourseDayRows`, `fetchAttendance` sessions, `fetchSentForPeriod` — server-side the way 0067 did for the week strip (673 kB → 600 B).
- **RV-18 / A:F-13:** the 32 discarded read errors. Consequential sites listed in RV-18 plus `fetchCourses:447-450`, `fetchOfferings:1026-1034`, `fetchRules:404-412` (a failed `course_follow_up_config` read silently applies the global threshold), `fetchMemberWeek:2596`. Throw with an operator-readable sentence or annotate why empty is honest; spec that no un-annotated discard remains. **Expect this to surface failures that are currently invisible.**
- **C:RF-01 remainder:** replace `v_present_ids` `array_append` + `= any()` with a temp table / `unnest` join if 2.9's timing says so.

**Exit:** every `.in()` in `supabase/functions/**` chunked or exempted with a reason; `member_period_metrics` never read unpaged; 47 policies wrapped and lint-clean; no `TruncatedReadError` reaches a screen untranslated.

### Gate 4 — Durable, idempotent bulk send

The architecture is RV-11 = C:RF-04-G; RV-07 and C:RF-04-F are subsumed. **Introduce `pg_cron` here** — nothing in the system runs on a schedule, so no sweeper, reconciliation, retention or `generate_sessions` can exist until it does (C:RF-24, C:M).

- **Claim-and-drain (RV-11, C:RF-04):** `send-followups` becomes enqueue-only — validate, create the batch, write one `email_messages` row per recipient as `queued` in one transaction, return `batch_id` in <2s. A drain step (function invoked per chunk, or `pg_cron`) claims a bounded slice with `update … returning`, sends, records per message. Terminal batch status **derived from message rows**, never loop counters. `unique (batch_id, member_id, member_email_id)` already makes it idempotent. Result screen polls the batch.
- **Hoist the metrics (RV-07, C:RF-04-F, C:§18 #12):** one `member_period_metrics` call for the period, indexed by member — also fixes the "one batch, two versions of the truth" problem when an import commits mid-send.
- **SES resilience (RV-08, RV-09, A:F-26 in B numbering, C:RF-11):** retry 429/5xx/network with exponential backoff, `attempt_count` incremented not written as `1`; classify `failed_transient` vs `failed_permanent`; distinct **`unknown`** outcome for a timeout after the request was sent, reconciled against `provider_message_id` — never retried blind; `AbortSignal.timeout()` on the SES fetch; token-bucket rate limiter sized from the account's actual send rate (read it first — §6). "Retry the failures" action on the result screen sends only to transient rows under the existing batch.
- **Sweeper (C:RF-06, B:F-14):** `pg_cron` job marking `email_messages` in `sending`/`queued` older than N minutes and `email_batches` in `processing` older than 1h as `unknown / needs reconciliation`, surfaced on the result screen.
- **Third write state (RV-12, A:F-24, B:F-10):** writes get a "did not hear back" state naming the batch/import id with a way to check it. Stop asserting "Nothing was written" / "Nothing has been sent" where the client cannot know it (`upload.tsx:672, :716`, `send/index.tsx:238`).
- **Repeat-send policy (RV-31, B:F-06):** per D-6.
- **`fetchNotifications` (C:RF-16):** `.limit(NOTIFICATION_LIMIT)` with no `.order()` — add `.order('sent_at', desc, nullsFirst: false)` and an index on `(status, sent_at desc)`.

**Exit:** kill the drain mid-slice; every message is in a defensible state; batch status derives from rows; same `client_batch_id` retry delivers nothing twice; a 429 storm ends in `failed_transient` rows with a retry action, not permanent failures.

### Gate 5 — Atomic security controls and data-integrity guards

- **RV-13, RV-14, A:F-08, A:F-42:** atomic `update app_users set failed_attempts = failed_attempts + 1 … returning` in `auth-login/index.ts:64-70`, `recovery-check/index.ts:105` (+ its upsert), `pin-reset-request/index.ts:69-88`. **Also reset `failed_attempts` to 0 when `locked_until` expires** — today the counter stays ≥5 so the next wrong PIN re-locks immediately, and combined with the accepted `auth-lookup` enumeration oracle (ADR 008) an unauthenticated attacker can lock every staff account permanently (A:F-08). Apply the existing `auth_rate_limits` pattern to `auth-login`, keyed on IP and phone. Check the discarded limit-row read error (a failed read reads as "no attempts yet"). Name `onConflict` explicitly. Concurrency spec: N simultaneous wrong PINs, lock trips at 5. Use the RV-38 advisory-lock pattern where a row lock is not enough.
- **RV-15:** `is_active` check in `recovery-check`, matching `auth-login`.
- **RV-04, RV-16, A:F-03, A:F-27, B:F-09, B:C-5:** `refuse_course_duplicate` onto a `BEFORE INSERT OR UPDATE` trigger on `member_emails` and `member_aliases` — address and display-name checks only (a NAME check would have made 34 live members un-editable, per 0071's production measurement). Call it in `commit_csv_import`'s `add_email` branch (B:F-09) and `add_as_new` branch under the course advisory lock (B:C-5). Then either revoke `authenticated`'s direct `insert, update` on the three member tables (`0006:159-167`) or add a column-guard trigger mirroring `guard_app_users()`. Extend `migrationGrants.test.ts` to table/column grants (`KL-008`).
- **RV-32:** `audit_attendance` on insert/delete, `audit_members` on delete — or record explicitly that direct deletes are out of scope.
- **B:S-1 / A:F-27(ses):** move the `ses-feedback` shared secret from `?s=` query string (logged by every proxy) to a header; verify the SNS message signature.
- **B:S-2:** any active staff can mail the whole academy via `requireCaller`. If unintended, a per-caller daily recipient cap against `email_batches`. **Owner decision needed** — flagged, not decided.

**Exit:** lock trips at 5 under concurrency and expires cleanly; no direct write path bypasses the duplicate rule; SNS notifications signature-verified.

### Gate 6 — Remaining P2/P3, scale programme, and debt

- **Import matcher (RV-26, A:F-07, B:F-12, C:RF-02):** measure first at 1,000/2,000/5,000 (Node benchmark of `_shared/match.ts` against the real loop). Then: `Map<normalized, memberId[]>` for alias and canonical tiers (O(N×M) → O(N+M)); prefilter the fuzzy tier by length band or first bigram; or push matching into Postgres (`name_normalized` is already indexed; `pg_trgm` for fuzzy). Cap `pickCsvFiles` with `maxBytes` like `pickFile` already has; parse in a Worker; detect BOM (C:RF-21).
- **Bulk RPCs (C:RF-17, C:RF-12):** set-based rewrite of `bulk_import_members` and `bulk_set_member_dates` removing the per-row `exception` subtransaction (64-subxid overflow degrades every other backend); **then** raise 0058's 500 cap to match the client's `STATUS_IMPORT_MAX_ROWS = 5000`. Order matters.
- **`generate_sessions` has no caller (B:F-08, C:RF-24):** "Awaiting upload" is dead — `fetchPendingSessions` filters `status='scheduled'`, which nothing produces. Either schedule `generate_sessions` via `pg_cron` (Gate 4 makes this possible) or generate expected days from `offering_schedules` left-joined to `sessions`, the shape `course_week_day_status` already uses. Remove the `.limit(20)` (B:F-21).
- **Two definitions of "enrolled" (A:F-18):** `expected_members_for_session` selects by date range only; every client read uses `.eq('status','active')`; neither filters `members.deleted_at`. Add `e.status = 'active'` and the `deleted_at is null` join; decide once whether `inactive` members are expected. Add the missing index on `member_schedules (effective_from, effective_to)` — it is on the import's hot path (C:§6).
- **Timezone (A:F-16, A:F-17, RV-29):** `app_settings.timezone` is stored and read by nothing; 20 migrations use bare `current_date` (UTC) while `period.ts` builds local dates — they disagree by a day between 00:00 and 05:30 IST (`0035:98` refuses today's attendance; `0049` stamps `joined_on` yesterday; `is_in_course` `0071:140`). Set the timezone on the role or replace bare `current_date`; sweep the three client UTC `today()` sites to the local helper; either read `week_start_day` or delete it.
- **Staff-name collision (A:F-21, B:F-20):** set aside a name only if it matches staff **and** matches no member enrolled in this offering — 0071 measured 14 names held by two live members of one course; a member sharing a staff name is never marked present and is eventually mailed for it.
- **Client/server "same name" drift (A:F-22, B:F-18):** `dedupeRows` and `normalizeName` disagree; share the module (the project already does this for `unsubscribe-token.ts`).
- **Import row numbers (RV-23, RV-24, RV-25, A:F-23, B:F-17, B:F-19):** carry source line number; name blank rows; parse quoted newlines or refuse unterminated quotes; validate `meeting_started_at` shapes before the `timestamptz` cast.
- **UI at scale (C:RF-10, C:RF-14):** no list is virtualized — `FlatList` for the four long lists or `readBounded`, which exists, is correct, and is unused. Thread `AbortController` into `withTimeout` so a 12s timeout cancels instead of leaving retries to multiply in-flight work.
- **Concurrency (B:C-1..C-7, C:§11):** catch `23505` on `csv_imports_sha_completed` and re-raise the `already_imported` sentence (B:C-1); re-check `supersedes` inside the commit transaction (B:C-2); `updated_at` precondition on `update_member` / `set_member_status` (B:C-4); `delete_members(uuid[])` server-side instead of N sequential RPCs (C:RF-25).
- **Registers (RV-33, A:F-31):** refresh `KL-005` to the keyset pager; write `RC-046` for the 0071 incident; delete the `useScreenState` stub, keep the type. Fix `aliasClaimedMessage` wording and retire `supabase/apply_all.sql` (FR).
- **Growth (C:RF-18, C:N):** partition `audit_logs` and `attendance_records` by month before either passes ~10M rows.
- **Scale programme (C:§23):** run it against the Gate 2.9 fixture. Gate for declaring a scale supported: Phases 1–3 green and chaos items 14–16 producing a defined, recoverable outcome.

---

## 5. Monitoring to add (there is currently no telemetry sink)

`guardUntruncated`'s reporter writes to `console.error`. Everything below is invisible today (C:§22, A:§10). Add a sink in Gate 2; wire these as Gates 3–4 land.

- Postgres `statement_timeout` events filtered to `user_name = 'authenticator'` — the alarm for the import ceiling.
- Edge Function shutdown reasons: alert on `CPUTime` and `WallClockTime`; 546/504 counts per function.
- `email_batches.status = 'processing'` > 1h; `email_messages.status in ('sending','queued')` > 1h; any `exclusion_reason = 'Member not found'`; two batches with overlapping period and recipients within 24h.
- Every `TruncatedReadError` and `PagedReadError` with its label; count of "This is taking too long".
- `select count(*) from offering_schedules`; row counts and `pg_total_relation_size` for `audit_logs`, `attendance_records`, `email_messages`.
- SES CloudWatch `Reputation.BounceRate` / `ComplaintRate`, send-rate and quota utilisation; SNS subscription state.

---

## 6. Verify before acting (Tier C)

Not work items until measured or confirmed. Each names the read or benchmark that promotes it.

| Item | Source | What settles it |
|---|---|---|
| Matcher exceeds 2s Edge CPU at 2,000×2,000 | RV-26, C:RF-02 (*Strongly Suspected*) | Node benchmark of `_shared/match.ts` (C:§20 #3) |
| 456-recipient send exceeds wall clock today | C:RF-11 model | Time `send-followups` at 50/200/500 with the dev provider (C:§23 #10) |
| Subtransaction overflow measurably degrades concurrent reads | C:RF-17 (*Strongly Suspected*) | `pg_stat_slru` Subtrans during a 500-row import |
| Academy-wide alias name density forces row-by-row decisions at 5,000 | C:RF-19 | Moot after 0073 (per-member uniqueness); re-evaluate |
| `csv_imports.summary` payload MBs at 10,000 rows | C:RF-22 | `pg_column_size` on a real preview row |
| `meeting_started_at` long-form cast fails / stored −5h30 | A:F-23, B:F-23 | `select distinct meeting_started_at from csv_imports order by 1 desc limit 20` vs the source files |
| SNS fan-out at 10,000 emails saturates the pool | C:RF-26 | Connection pool peak during a large send |
| SES sandbox state, send rate, 24h quota | C:§3 (all `[U]`) | AWS console — **required before sizing Gate 4's rate limiter** |
| Edge Function request body limit vs a 10,000-row preview | C:§3 `[U]` | One probe at 1 MB / 5 MB |
| `expected_members_for_session` returns duplicate `member_id`s for any live session | A:V-8 | Run over recent sessions |

---

## 7. Open for the owner

- **B:S-2** — should any active staff account be able to mail the whole academy? Today it can. Decide before Gate 5.
- **75 vs 77** — the consolidated master register's count. Raw finding counts are A:46, B:32 (+16 C/S/T), C:25 — 103 or 119 before de-duplication. Only the consolidated document settles it; it is still not on any machine.
- **Retention** — how long to keep `audit_logs` and `email_messages`. Needed before Gate 6 partitioning.

---

## 8. Out of scope

Anything requiring production evidence beyond §3's reads: live RLS policies and grants (§0.9 lint covers policies), live `db-max-rows`, SES quota (see §6), whether the SNS subscription is confirmed, current row counts. The 77-item consolidated table, until its source is supplied. Behaviour of `.harness/` beyond wiring it into CI.
