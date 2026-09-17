# RosiFit — Issue Tracker

Companion to `REMEDIATION_WORK_ORDER.md`. One row per underlying defect. Where several audits found the same thing, the row lists every source ID — so this is the de-duplicated table the RV register wanted and could not build. When the consolidated 75/77-item register is found, map its IDs onto these rows; do not create new rows for them.

Lives at `docs/registers/ISSUE_TRACKER.md`. Append-only for rows; the Status column is the only thing that changes.
(Renamed from `RosiFit_Issue_Tracker.md` and `RosiFit_Remediation_Work_Order_v2.md` on 17-Sep-2026 via `git mv`, so the history follows.)

---

## The loop — run this for every row, no exceptions

1. **Take the next open row in the current gate that belongs to your surface (D-9).** Never take a row from a later gate while an earlier gate has open rows. Gate 0 rows are reads, not fixes — they can run in parallel with Gate 1. **Claim it first:** write `⏳ A` or `⏳ B` into the row's Status cell, `git pull --rebase`, push. A row already carrying the other session's claim is skipped. Session A owns `supabase/migrations`, `supabase/tests`, `db/harness` and any row whose fix is SQL; Session B owns `app/`, `src/`, `supabase/functions/`, `.github/`, `tsconfig`, `package.json`. Neither edits the other's files — if a B row needs SQL, B notes it in the row and leaves it for A; if a row's Verify needs a production read, B writes the exact query into the row for A.
2. **Branch** `fix/<row-id>` (e.g. `fix/T-043`).
3. **Write the failing test first.** The row's *Proof* column names it. If the row has no proof named, the first commit on the branch is the test. If a test cannot exist (a doc change), say so in the PR.
4. **Make the change.** One row per PR. If you find a new defect while in there, **add a row** — do not fix it in the same PR.
5. **Run `npm run check` locally.** Push. CI runs `gate` and `db-harness`. Both must be green. (Until Gate 2.2 lands they are not yet *required* on `main` — read them anyway; a merge on red is a Gate 2 violation.)
6. **If the PR carries a migration:** apply per D-3 (`db query --linked -f`, then `migration repair`), never `db push`. Run the row's *Verify* read against production afterwards.
7. **Write the root-cause entry** in `docs/registers/ROOT_CAUSE_REGISTER.md` as the next `RC-nnn` from your session's block (D-9: Session A RC-046–RC-069, Session B RC-070–RC-099; the register stays newest-first by date, not by number; the 0071 incident is RC-046 and is T-013's entry). The template is below. The PR is not mergeable without it — add a CI/spec check that every PR touching `src/`, `supabase/` or `app/` also touches `ROOT_CAUSE_REGISTER.md` or carries a `no-rc:` label with a reason. A fix without a recorded cause is how the same class recurs one file over (RC-039 → RC-043 → RV-05).
8. **Tick the row** — `⏳ A`/`⏳ B` → `☑ PR#, date, RC-nnn`. Every push that touches the three registers is preceded by `git pull --rebase`; register edits are line-local and a conflict is resolved by keeping both sides (D-9). Rows that were `NEEDS VERIFICATION` and turned out not to be defects get `☒ not a defect` with the read that showed it.
   **`RUN_LOG.md` lines are written by `scripts/run-log.mjs`, for gate verdicts only — never by hand.** A Gate 0 row is a read, not a run: it has no gate verdict, so it records its result in its own tracker row and nowhere else.
9. **Gate exit** is the exit condition in the work order, not "all rows ticked" — some rows can legitimately move to a later gate with a written reason in the row.

### RC entry template (one per ticked row)

```
## RC-nnn — <one-line name>                          Tracker: T-nnn · Sources: RV-xx, A:F-xx …
Symptom       What the operator / the data / the log actually showed. Dated if known.
Root cause    The mechanism, not the site. "ON CONFLICT infers an index, not a rule" — not
              "commit_csv_import failed." Name the file:line where the mechanism lives.
Why it shipped  The check that should have caught it and why it did not run or could not see
              it (the test that was never run, the guard scoped to one file, the tsconfig exclude).
Class         Which other sites carry the same mechanism. Enumerate them — this is the sweep.
              If this fix closes only the one site, say so and open tracker rows for the rest.
Fix           What changed, with file:line and migration number. What deliberately did NOT change.
Proof         The test that fails without the fix and passes with it. Its path.
Guard         What now makes the class a build failure rather than a review finding.
Verify        The production read taken afterwards, its result, its timestamp.
```

The two fields that matter most are **Why it shipped** and **Class**. Every audit found the same shape: a rule established, specced, and applied to the file where it was discovered rather than everywhere it holds. If those two fields are honest, the register becomes the sweep list for the next audit instead of a memorial.

Cadence honesty: at ~3–5 h/weekday for two people, Gate 1 is about a week and Gate 2 another one to two. Gates 3–6 are a quarter. Gate 7 is polish that goes through a working pipeline whenever there is slack. Do not compress Gate 2 — it is the gate that makes every later tick mean something.

Status marks: `☐` open · `☑` done (PR#, date) · `☒` not a defect / superseded (reason) · `→G<n>` moved with reason

---

## Gate 0 — Read-only verification (parallel with Gate 1)

| ID | Read | Sources | Settles | Status |
|---|---|---|---|---|
| T-001 | GitHub Actions history for `main` — `gate` and `db-harness` state | RV-40, A:F-09/F-10 | Whether CI is red, green, or not running | ☑ 17-Sep-2026, read-only via the GitHub API. One workflow (`CI`, `.github/workflows/ci.yml`), 80 runs on `main`, **0 green**. #2–#80 (2–11 Sep): no step of either job ever ran — every check-run annotated *"The job was not started because your account is locked due to a billing issue."* #82 (11-Sep 10:03 UTC) onward: both jobs execute. `gate` fails at `npm run check` every run (RV-03). `db-harness` installs psql 16, replays every migration clean, runs all 56 spec files (~4 min), and has been red every run: 16 files at #82, 19 at #99 (`5e361de`, 0071), 18 at #103/#104. `main` is unprotected (`protected:false`, required checks off) — a red run blocks nothing. Step name still says "135 assertions"; there are 776. Job logs were fetched with the credential the machine already holds for `git push`, sent as a header to api.github.com only, never printed. |
| T-002 | `email_batches where status='processing'` | RV-41, C:RF-06 | Killed sends already in prod | ☐ |
| T-003 | `email_messages group by status` | B:unknown-5, B:F-14 | Rows stuck in `sending` | ☐ |
| T-004 | Is 0072 applied? `fetchMembers` selects `active_again_from` | B:unknown-8 | Member list may fail outright | ☒ not a defect — 17-Sep-2026: `supabase_migrations.schema_migrations` holds `20260916093816 / 0072_member_active_again_from` (read during T-013's ledger check). |
| T-005 | `pg_roles.rolconfig` for `authenticated`, `service_role`, `authenticator` | C:§20-2, A:V-4 | Real `statement_timeout` (import ceiling) | ☐ |
| T-006 | `count(*) from member_period_metrics(<this week>)` | B:unknown-4 | Whether T-042 fires today | ☐ |
| T-007 | `csv_imports` status since 2026-09-16 | B:unknown-3 | Whether any import has succeeded since 0071 | ☑ 17-Sep-2026, read-only on prod `lhpzhkzbnquwjljmbylo`. **Yes — one, and only because it carried no new names.** 0071 went live 16-Sep 05:08 UTC (commit `5e361de`). Since then exactly one import completed: `81341cf8` 17-Sep 01:06 UTC, `unmatched_count=0`. Every import since 0071 carrying ≥1 unmatched row is still `previewed` and never completed: `d4dac576` (5), `e16d3bfc` (5), `de133ddc` (5), `5530afac` (1), `310dfaef` (1). Those five are **the only `previewed` rows in the table's entire history** — 42 `completed`, 9 `reverted`, and before 16-Sep 11:09 UTC not one stranded preview. Last `add_as_new` to reach the database: `a03e5c9e`, 16-Sep 03:08 UTC — pre-0071. No `members` or `member_aliases` row created by an import since. Confirms Problem 2 is live and dates its onset to 0071's apply. Caveat: `csv_imports.error` is null on all 56 rows ever and no row has ever held `status='failed'`, so a stranded preview is consistent with a failed commit but is not itself proof of an attempt — see new row T-109. **Resolved 14:05 UTC:** gateway logs show a `commit_csv_import` 400 for each of the four 17-Sep previews (T-109 addendum). Attempts confirmed. |
| T-008 | Re-run 0073 duplicate-group count at apply time | RV-01, FR | Guard will pass | ☑ 17-Sep-2026 11:23:52 UTC, read-only on prod: **0** `(member_id, alias_type, alias_normalized)` groups with >1 row across 796 alias rows — the guard passes. `member_aliases_member_name_unique` absent; `pg_proc` scan finds the stale `on conflict (alias_type, alias_normalized)` in exactly `commit_csv_import` and `merge_member_into`. Also read: `merge_member_into` in production carries 0061's wording (`merged into themselves`), not 0032's — see T-111. |
| T-009 | `get_advisors(type:'performance')` | C:§20-4 | Confirms T-047; surfaces index gaps | ☐ |
| T-010 | SES console — sandbox?, send rate, 24h quota, config set, bounce/complaint rates | C:§3 `[U]` | Sizes Gate 4 rate limiter | ☐ |

Already settled by FR (record, don't re-read): RV-39 — `member_aliases_unique` absent in prod, stale clause in exactly `commit_csv_import` and `merge_member_into`, function bodies match repo. Import is broken in production.

## Gate 1 — Stop the bleeding

| ID | Defect | Sources | WO item | Proof | Verify | Status |
|---|---|---|---|---|---|---|
| T-012 | `db-harness` CI job runs but its verdict is unread: 18 of 56 spec files red since CI first executed (11-Sep), `main` unprotected, step name says 135 assertions (776) | RV-40, A:F-01, B:T-01, FR §6, T-001 | 1.1 / D-7 | `db-harness` green on `main`; step name corrected (776 assertions, not 135); verdict consumed via **T-026** | T-001 | ☐ **First in Gate 1 (reordered 17-Sep-2026): proof surface for T-011 and T-013** — neither can be shown green anywhere else. |
| T-011 | `04_members.sql:37,:40,:58` assert indexes 0071 dropped; suite contradicts `48:209-213` | RV-02, FR §11 | 1.1 / D-2, **D-2a** | `npm run test:db` green in CI (T-012 is the proof surface — no `psql`/`docker`/`supabase` on the dev machine). `:37`/`:40` re-pointed to `member_aliases_member_name_unique` via `RF-000118` (three literals each); `:58` inverted to acceptance + `t.ok` naming `refuse_course_duplicate`, cross-ref 48. **Depends on 0073 being in the replay.** | — | ☑ PR #20, 17-Sep-2026, RC-048. `db-harness` run #111 (`ab6bac6`, 14:15 UTC): `04_members.sql` green — all 16 assertions incl. the four re-pointed/rewritten; suite 790 PASS (was 779), red files 18 → 17. Merged `main` 17-Sep 21:0x UTC. |
| T-013 | `ON CONFLICT (alias_type, alias_normalized)` infers dropped index → `42P10`; whole import aborts; `merge_member_into` same | RV-01, RV-39, A:F-01, B:F-01, FR | 1.2 / D-3 | `51_alias_unique_per_member.sql` 1–9; `aliasConflictTarget.test.ts`; then one real upload | `pg_indexes` shows `member_aliases_member_name_unique` unique; `pg_get_functiondef` scan = 0 stale | ☐ |
| T-014 | `recompute_member_stats()` unscoped in `commit_csv_import` `0045:428`, `update_member` `0027:304`, `create_member` `0026:406` | A:F-06, B:F-07, C:RF-01-A | 1.3 (0074) | Harness spec: untouched member's stats row not rewritten by an import | Timing at 2,000 rows (T-062) | ⏳ A |
| T-015 | `expected_members_for_session()` called once per file row inside the loop | B:F-07, C:RF-01-B | 1.3 (0074) | Same harness spec; `v_expected_ids` computed once | — | ⏳ A (with T-014, one PR) |
| T-016 | `member_period_metrics` RPC unpaged/unguarded at `repository.ts:229, :1953, :1977` → silent zeros past 1,000 | A:F-02, B:F-02 | 1.4 stopgap | Fake-server test: 1,001 rows → throws, nobody zeroed | T-006 | ☐ |
| T-017 | `client_batch_id` never passed (`api.ts:269` optional; `send/index.tsx:225`, `member/[id].tsx:278` omit); server mints UUID; retries duplicate | RV-06, A:F-05, B:F-05, C:RF-05, B:C-6 | 1.5 | Spec: two calls same key → one batch; source-reading spec on call sites | — | ⏳ B (18-Sep-2026) |
| T-018 | Send screen `failed` gate omits `already.state==='error'`; `defaultSelection` pre-ticks everyone when sent-map unknown | B:F-06, C:RF-08 | 1.5 | Spec: `fetchSentForPeriod` rejects → nothing ticked, screen refuses | — | ☐ |
| T-019 | `fetchSentForPeriod` promises "costs the mark and nothing else" then `checked()` throws at 1,000 messages | A:F-15, C:RF-08 | 1.5 (route) / 3 (page) | Covered by T-018 spec + T-045 | — | ☐ |
| T-020 | `send-followups/index.ts:282` discards insert error; `msgRow!`, `emailRow!` ×2 → TypeError aborts batch mid-loop | RV-10 | 1.5 | Spec: failed insert fails one recipient, not the batch | — | ☐ |
| T-021 | PWA auto-reload fires on 60s idle or `hidden` while a send/import is in flight | RV-30, C:RF-20 | 1.6 | In-flight flag unit spec now; Playwright in Gate 2 | — | ☐ |
| T-111 | 0073 re-emits `merge_member_into` from 0032's body and so **reverts 0061's two de-gendered refusals** (`0073:540` "merged into herself", `:568` "an email address of her own, so merging her"); production holds 0061's wording today (T-008 read). 0061 edited in place via `pg_get_functiondef`; 0073 restated. No spec pins 0061's wording, which is why 51 and the harness are green on it. **Blocks T-013 — 0073 must not be applied as written.** | T-008 read 17-Sep-2026, 0061, 0071 "rewritten in place, not restated" | 1.2 | Copy-lock on the two 0061 strings in `merge_member_into` (fails on 0073 as written); 0073 corrected before apply | `pg_proc` scan: no `\y(she|her|herself)\y` in a `raise exception` in `merge_member_into` after apply | ☑ PR #19, 17-Sep-2026, RC-047. Proof: `51_alias_unique_per_member.sql` red on run #107 (`4b41a68`) on exactly the new copy-lock, green on #108 (`0f1b1e5`), 22/22. Verify (17-Sep 13:01:35 UTC, post-apply): `merge_member_into` holds 0061's wording — `merged into themselves` true, `merged into herself` false, no `she/her` in any `raise exception`. |
| T-115 | `send-followups` **mints a `client_batch_id` when the caller omits one** (`index.ts:55`, `String(body.client_batch_id ?? crypto.randomUUID())`), so an idempotency key the client forgot to send is silently replaced by one that can never collide — every retry is a fresh batch and a second set of emails. The key must be **required**: refuse with 400 when it is absent, rather than inventing one. Second half: the 409 raised at `index.ts:183` answers with a bare sentence (`This send has already been submitted.`) and no batch, so a client cannot say what the first attempt did without reading `email_batches` back itself. Return the existing batch's id and counts in the 409 body. | T-017, RV-06 | 1.5 | Deno spec: a body with no `client_batch_id` → 400, no batch row written; a duplicate key → 409 whose body carries the first batch's `id`, `requested_count`, `sent_count`, `failed_count`, `status` | — | ☐ **Session C's surface** (`supabase/functions/`) — unclaimed. T-017 ships the client half (key always minted and passed, 409 rendered as a result state) and does not depend on this row; until it lands the server still tolerates a caller that omits the key. |
| T-113 | **Upload sends no network request from the PWA the operator is using** — no `csv-import` invocation, no gateway `edge_logs` entry, no `csv_imports` row (17-Sep 13:07–13:42 UTC, two attempts). Server-side diagnosis 13:45–14:02 UTC: (a) production `rosi-fit.vercel.app` serves `entry-a8a63660….js` built from `cfce708` = `main` HEAD (deployed 12:58:05 UTC, READY, 0 commits behind); the bundle carries `lhpzhkzbnquwjljmbylo.supabase.co` and the anon JWT, so `isConfigured` is true there and an upload on that origin must hit the network. (b) `sw.js` on prod is byte-identical to `public/sw.js`: `VERSION='v1'`, shell-only, no precache list, `/_expo/static/` cache-first by content hash, documents network-first, POST never handled — it cannot swallow a request. (c) Gateway logs: the app's last live session today (06:00–07:00 UTC) was sign-in only (`/auth/v1/token`, `/rest/v1/app_users`); no upload was attempted against production today. (d) **Symptom reproduced on the dev machine:** `npx expo export --platform web` with a correct `.env` (expo logged `env: export EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_SUPABASE_URL`) still produced a fixture-mode bundle — no host, no key, `localhost:54321` fallback present — because of a **stale Metro transform cache**; `--clear` produced a live bundle. In fixture mode `app/upload.tsx:674` (`if (!staged.preview)` → `fixtureOutcome()`) reports the import completed instantly with no request. A local `expo start` on this machine shows exactly the reported behaviour. **Two tells for the operator:** (1) the address bar — `rosi-fit.vercel.app` is live; `localhost:8081` or any `rosi-fit-git-…` preview URL is suspect; (2) the sign-in phone field pre-fills `80563 29742` in fixture mode (`app/index.tsx:25`), empty in live mode. **Fix for a local session:** `npx expo start --clear` once (the `--clear` export on this machine produced a live bundle from the same `.env`). Underlying defect filed as T-114. Vercel env-var scoping (Production vs Preview) is not readable through the tools available; a Preview URL built without `EXPO_PUBLIC_*` would behave the same way. Cause is client-side and not diagnosable further without a browser trace. | T-013 verification attempt; `app/upload.tsx:166,:674`; `src/lib/supabase.ts:19` | 1.2 | Owner: the tab's origin (address bar), whether the phone field pre-fills, Network tab on one upload. Then one upload on `rosi-fit.vercel.app` produces `function_edge_logs` + a `csv_imports` row. Rung to file if confirmed: fixture mode must announce itself on screen, never silently report a write as done | — | ☐ |

## Gate 2 — Turn verification back on (freeze lifts at exit)

| ID | Defect | Sources | WO item | Proof | Status |
|---|---|---|---|---|---|
| T-022 | `npm run check` red: 9 failures | RV-03, A:F-09 | 2.1 | `npm run check` green | ☐ |
| T-023 | `courses.tsx:7` dead `Dropdown*` imports; list-screen filter rule violated — **real regression** | A:F-28 | 2.1 | `formDropdownMenu.test.ts:148` passes by fixing code | ☐ |
| T-024 | `memberJoinedOn.test.ts:141` brittle 600-char window | A:F-40 | 2.1 | Test passes on the passing implementation | ☐ |
| T-025 | `message.test.ts` ×5, `rosterFilter.test.ts` ×2 copy-locks not re-pinned | RV-03 | 2.1 | Each still pins a rule | ☐ |
| T-026 | `gate`/`db-harness` not required; Vercel deploys on red; no post-deploy smoke; `post-release-monitor` unscheduled | RV-20, A:F-10, A:§10 | 2.2 | Branch protection screenshot in PR; red CI blocks a test deploy | ☐ |
| T-027 | `tsconfig` excludes `supabase/`, `scripts/`, `**/*.test.ts` — Edge Functions and specs untypechecked | RV-21, A:F-11 | 2.3 | `deno check` in `npm run check`; introduce a type error in a scratch branch, watch it fail | ☐ |
| T-028 | `requestSize.test.ts` `MUST_CHUNK` is a 2-entry allowlist | RV-27, B:T-02, C:L | 2.4 | Every `.in()` in `src/**` + `supabase/functions/**` chunked or `BOUNDED` with reason | ☐ |
| T-029 | `edgeFunctionPagedReads.test.ts` pins one file | RV-28, B:T-02 | 2.4 | Walks every function dir | ☐ |
| T-030 | `pagedReads.test.ts` never scans `supabase.rpc(` | B:T-03, A:F-02 | 2.4 | RPC set-returning reads paged/bounded/exempted | ☐ |
| T-031 | No rule against dropping an index still named in `ON CONFLICT` | A:§12-P4, FR test | 2.4 | `aliasConflictTarget.test.ts` generalised to all indexes | ☐ |
| T-032 | Unchunked `.in()` in `resolveContext` `:1574-1602`, `fetchNotifications` `:2144`, `csv-import:297-303` | A:F-29, C:RF-15 | 2.4 (covered by T-028) | T-028 names each with reason or chunks it | ☐ |
| T-033 | Duplicate migration prefixes `0038`×2, `0044`×3, `0045`×2, `0057`×2, `0041` gap; test prefixes `30`,`34`,`48` | RV-19, A:F-19, B:unknown-9 | 2.5 / D-3 | Collision check fails-first naming all four | ☐ Ledger scheme (read 17-Sep-2026): every remote `schema_migrations` row is a 14-digit timestamp `version` with `name` = the file name (`20260916050449 / 0071_duplicate_is_per_course`); local files are `00nn_`-prefixed, so the two ledgers share no version strings. New applies follow the remote shape: 0073 is recorded as `20260917hhmmss / 0073_alias_unique_per_member` via `migration repair`. |
| T-034 | Gates G1/G2/G3 crash (`design/tokens.json`), G5 empty, G6 blocked, G8 nonexistent script, G10/G13 inert, `conformance.json` all BLOCKED | A:F-10 | 2.6 | Each gate either passes or is deleted with a `DECISION_LOG` line | ☐ |
| T-035 | ESLint configured, not installed, not run; CI comments say no runner exists while `check` runs 1,628 tests | RV-22, A:F-10 | 2.6 | `lint` script + CI step; both CI files' comments corrected together | ☐ |
| T-036 | No runtime test of any screen; 19 `.harness/` checks wired to nothing | A:F-12 | 2.6 | ≥3 harness checks in CI | ☐ |
| T-037 | No DB gate — `test:db` is not one of the 13 | A:F-10 | 2.7 | G14 exists and blocks | ☐ |
| T-038 | No `supabase/config.toml`; `verify_jwt` only in comments; already flipped once on redeploy | RV-17, A:F-20 | 2.8 | Spec: every function dir has an entry | ☐ |
| T-039 | Harness has no volume fixtures; every SQL test is a handful of rows | A:§12-P4, B:T-04, C:§23-P0 | 2.9 | `seed_scale.sql` at 500/2,000/5,000 runs | ⏳ A (seed only, first commit of fix/T-014; timings stay open) |
| T-040 | Harness cannot assert grants; `migrationGrants.test.ts` covers functions only | A:K-04 (KL-008), RV-16 | 2.9 → used in G5 | Table/column grant coverage added | ☐ |
| T-112 | Migrations that restate a function body from a historical file revert later in-place edits (0061/0071 `pg_get_functiondef` idiom). 0073 did it to `merge_member_into` (T-111); sweep of every restatement after 0060 found no second instance yet | T-111, 0071 header | 2.4 | Rung: spec fails if a migration `CREATE OR REPLACE`s a function edited in place by any migration numbered between the restated source and itself | ☐ |
| T-117 | **The commit guard cannot see a harness spec.** `scripts/hooks/pre-commit-guard.sh:94-101` (G1) accepts a change as tested only when a path matches `(\.spec\.|\.test\.|tests/cases/)`, so a commit whose ONLY change is a `supabase/tests/*.sql` spec is blocked and needs `CASES-NA:` — the token then says "no test" about a commit that is nothing but a test. `code_changed()` also matches `supabase/` wholesale, so a spec drags in G2's TEST_SUMMARY obligation as though it were application code. Second, smaller: `.claude/hooks/pre-tool-use-guard.mjs:38-45` reads a `-F <file>` message at hook time, so the file must already exist from an earlier tool call — writing the message and committing in one call always fails. Hit on the T-011 commit (`ab6bac6`) and the 52 commit (`b069661`); both shipped with a `CASES-NA` that is literally untrue | this session, T-011, T-014 | 2.6 | G1 counts `supabase/tests/*.sql` as a test case; a spec-only commit needs no token | ☐ (Session C's surface — unclaimed. Filed as T-117, not T-115: B took that number) |

## Gate 3 — Bounded reads and RLS cost

| ID | Defect | Sources | WO item | Proof | Status |
|---|---|---|---|---|---|
| T-041 | `send-followups` `.in()` ×4 unchunked/unpaged (`:108,:113,:152,:155`) + 5th on `course_offerings`; 4 of 5 discard error | RV-05, A:K-02 (KL-009), B:F-03, C:RF-03 | 3 | Fake-client test at 1,001 recipients: no recipient classified from a missing map entry; T-028/T-029 fail-closed | ☐ |
| T-042 | `member_period_metrics` proper fix — `period_totals()` for summing callers; keyset for `fetchMembers` | A:F-02, B:F-02 | 3 | Fake-server 999/1,000/1,001 → correct totals, nobody zeroed | ☐ |
| T-043 | 47 RLS policies call `is_active_app_user()` bare — re-evaluated per row; 0013 fixed two and never generalised | C:RF-07 | 3 | `09_grants.sql` asserts no bare helper; T-009 lint clears | ☐ |
| T-044 | `offering_schedules` read whole, unguarded, in `fetchCourses`/`fetchOfferings`/`fetchBranchUsage`; grows with time | C:RF-13 | 3 | Spec: 1,200 schedule versions → correct current weekdays | ☐ |
| T-045 | `TruncatedReadError` bypasses `fail()` translation — developer sentence reaches operator; `checked()` kills `fetchCourseDayRows`, `fetchAttendance`, `fetchSentForPeriod` at 1,000 | A:F-25, A:F-14, C:RF-09 | 3 | Spec: 1,000-row course-day renders; error text is person-readable | ☐ |
| T-046 | 32 reads discard `error` → false zeros incl. inside a sent email; `fetchRules` silently applies global threshold | RV-18, A:F-13 | 3 | Spec: no un-annotated discard remains | ☐ |
| T-047 | `upload.tsx:963` renders `err.message` raw; `ENGINE_WORDING` misses `42P10` wording | FR §9 | 3 | Spec: `42P10` text → translated sentence | ☐ |
| T-048 | `v_present_ids` `array_append` + `= any()` O(n²) in `commit_csv_import` | C:RF-01-C | 3 (if T-062 timing says so) | Timing at 2,000 rows under 8s | ☐ |
| T-109 | A failed `commit_csv_import` leaves no server-side trace: the `status='failed'` / `error` write sits inside the transaction that aborts, so it rolls back with it. `csv_imports.error` is null on all 56 rows ever written and no row has ever held `status='failed'`. A stranded `previewed` row is the only evidence a commit was attempted, and it cannot be distinguished from a preview the operator abandoned | T-007 read 17-Sep-2026 | new — placed in Gate 3, move if it belongs elsewhere | Harness: a commit that raises inside the transaction still leaves a durable `failed` row naming the SQLSTATE (written by the caller after the rollback, or from an autonomous transaction) | ☐ Addendum 17-Sep 14:05 UTC: the gateway `edge_logs` DO record the attempts — `POST /rest/v1/rpc/commit_csv_import` → **400** at 01:02:01, 01:03:12, 01:54:52, 01:55:31 UTC, each ~1.5 s after its preview's `POST /rest/v1/csv_imports` 201; the one 200 (01:06:33) is the zero-unmatched file. The database holds no trace; the gateway holds it for the log retention window only. |
| T-114 | **A production-configured build can silently fall back to fixture mode** (`localhost:54321`, fake outcomes, no request) when the Metro transform cache is stale; nothing in the build or at runtime refuses to ship or run an unconfigured bundle. Reproduced 17-Sep-2026 on the dev machine: `expo export` with a correct `.env` → bundle with no host and no key; `--clear` → live bundle. `isConfigured=false` is only a `console.warn` in `__DEV__` (`src/lib/supabase.ts:21`); `upload.tsx:674` then reports an import completed without a request | T-113, `app/upload.tsx:674`, `app/index.tsx:25`, `src/lib/supabase.ts:19-28` | 3 | (1) a spec that fails the export when the bundle lacks the Supabase host; (2) a runtime refusal in the app when `isConfigured` is false on a non-localhost origin | ☐ |

## Gate 4 — Durable, idempotent bulk send (introduces `pg_cron`)

| ID | Defect | Sources | WO item | Proof | Status |
|---|---|---|---|---|---|
| T-049 | Send is one synchronous loop on an open browser request; terminal status written only at end; no resume, reconcile, or listing | RV-11, RV-07, A:F-04, B:F-04, B:F-32, C:RF-04, C:RF-06 | 4 claim-and-drain | Kill drain mid-slice → every row defensible; status derived from rows; same key retry sends nothing twice | ☐ |
| T-050 | `member_period_metrics` once per recipient in the loop; one batch, two versions of the truth if an import lands | RV-07, C:RF-04-F, C:§18-12 | 4 | Metrics read once per batch | ☐ |
| T-051 | SES non-2xx = permanent `failed`, `attempt_count` literal 1; no backoff, rate limit, quota awareness, or `AbortSignal` | RV-08, B:F-26, C:RF-11 | 4 | Fake provider 429,429,200 → one delivery, `attempt_count`=3 | ☐ |
| T-052 | Timeout after SES accepted recorded as `failed`; retry double-sends | RV-09 | 4 | `unknown` state; reconciled by `provider_message_id` | ☐ |
| T-053 | `sending` is terminal in practice; nothing reads `sending`/`queued`/`processing` back | B:F-14, C:RF-06 | 4 sweeper | `pg_cron` job marks stale rows `unknown`; surfaced on result screen | ☐ |
| T-054 | Writes have no third state; "Nothing was written / sent" asserted on transport failure (`upload.tsx:672,:716`, `send/index.tsx:238`) | RV-12, A:F-24, B:F-10 | 4 | Spec: dropped response → "did not hear back" naming batch/import id | ☐ |
| T-055 | Already-sent guard is advisory, client-side; no server refusal | RV-31, B:F-06 | 4 / D-6 | Server refuses without `resend:true` | ☐ |
| T-056 | `fetchNotifications` `.limit()` with no `.order()` — tray freezes on oldest failures | C:RF-16 | 4 | Spec: 100 historical failures → newest shown | ☐ |
| T-057 | No cancellation of a running send or import; `callFn` passes no `AbortSignal` | B:F-31 | 4 (drain makes cancel = stop claiming) | Cancel action leaves queued rows unsent | ☐ |

## Gate 5 — Atomic security controls and integrity guards

| ID | Defect | Sources | WO item | Proof | Status |
|---|---|---|---|---|---|
| T-058 | `auth-login:64-70` read-then-write `failed_attempts`; parallel guesses never trip lock | RV-13 | 5 | Concurrency spec: N simultaneous wrong PINs → lock at 5 | ☐ |
| T-059 | Same in `recovery-check:105` + upsert, `pin-reset-request:69-88`; limit-row read error discarded; default conflict target | RV-14 | 5 | Same spec per function | ☐ |
| T-060 | `failed_attempts` never resets on `locked_until` expiry; + `auth-lookup` oracle + no rate limit on `auth-login` = permanent lockout of every staff account | A:F-08, A:F-42 | 5 | Spec: lock expires → counter 0; `auth_rate_limits` applied to `auth-login` | ☐ |
| T-061 | `recovery-check` never checks `is_active` | RV-15 | 5 | Spec: disabled super-admin refused | ☐ |
| T-062 | `member_emails_unique_live` dropped, no replacement; `add_email` branch unguarded | RV-04, A:F-03, B:F-09 | 5 trigger | Harness: duplicate address in same course refused with Edit form's sentence; and `04_members.sql:58` re-inverted to `t.rejects` against the new trigger (D-2a) | ☐ |
| T-063 | `commit_csv_import` `add_as_new` creates members outside the course advisory lock | A:F-03, B:C-5 | 5 | Harness: concurrent import + Add Member → one record | ☐ |
| T-064 | `authenticated` holds direct `insert,update` on `members`, `member_emails`, `member_aliases`; `src/lib/supabase.ts` header says otherwise; no column guard | RV-16, A:F-27 | 5 | T-040 grant spec; direct PATCH refused or guarded | ☐ |
| T-065 | `audit_attendance` update-only; `audit_members` no delete | RV-32 | 5 | Trigger spec, or documented out-of-scope | ☐ |
| T-066 | `ses-feedback` secret in `?s=` (logged); no SNS signature verification | B:F-27, B:S-1 | 5 | Forged notification with valid secret, bad signature → refused | ☐ |
| T-067 | Any active staff can mail whole academy via `requireCaller`; no volume cap | B:S-2 | 5 — **owner decision** | Cap spec if decided | ☐ |

## Gate 6 — Remaining P2, scale programme, debt

| ID | Defect | Sources | WO item | Proof | Status |
|---|---|---|---|---|---|
| T-068 | Matcher O(rows×members): linear alias/canonical scans + Dice per member, allocation per call | RV-26, A:F-07, B:F-12, C:RF-02 | 6 (measure first — T-090) | Benchmark 2,000×2,000 under 2s CPU | ☐ |
| T-069 | `pickCsvFiles` no `maxBytes`; sync main-thread parse; UTF-8 assumed | C:RF-21 | 6 | 10,000-row fixture in time budget | ☐ |
| T-070 | Per-row `exception` subtransactions in `bulk_import_members`/`bulk_set_member_dates` (64-subxid overflow) | C:RF-17 | 6 (set-based rewrite) | Concurrent-read latency during a 500-row import | ☐ |
| T-071 | Status import: client 5,000 vs server 500 cap | C:RF-12 | 6 (**after** T-070) | Harness spec at 501 rows | ☐ |
| T-072 | `generate_sessions` has no caller; "Awaiting upload" dead; `.limit(20)` | B:F-08, C:RF-24, B:F-21 | 6 | Tuesday offering, no import → Tuesday awaiting | ☐ |
| T-073 | Two definitions of "enrolled"; `expected_members_for_session` ignores `status`, `deleted_at` | A:F-18, A:V-8 | 6 | Harness: ended/soft-deleted member not expected | ☐ |
| T-074 | Missing index `member_schedules (effective_from, effective_to)` on import hot path | C:§6 | 6 | `explain analyze` before/after | ☐ |
| T-075 | DB `current_date` is UTC (20 migrations); `app_settings.timezone`, `week_start_day` stored and read by nothing; client `schedule.ts:62 today()` UTC at 3 sites | A:F-16, A:F-17, RV-29 | 6 | Clock pinned 02:00 IST: attendance markable, `joined_on` today, schedules today | ☐ |
| T-076 | Member sharing a staff name set aside every week, never marked present | A:F-21, B:F-20 | 6 | Fixture: member + staff same name → member present | ☐ |
| T-077 | `dedupeRows` vs `normalizeName` disagree on "same name" | A:F-22, B:F-18 | 6 | Both pinned to one fixture table via shared module | ☐ |
| T-078 | Row numbers index filtered attendees, not file lines | RV-23, B:F-17 | 6 | Fixture with preamble + dropped rows → real line named | ☐ |
| T-079 | Blank rows dropped client-side uncounted; `dropped_count` merges blanks+dupes; `duplicates_in_file` counts N blanks as N−1 | RV-24, B:F-19, B:F-16 | 6 | Fixture: 2 blank rows → named by line | ☐ |
| T-080 | Quoted field with embedded newline mis-parses | RV-25, A:F-35 | 6 | Parse across lines or refuse unterminated quote | ☐ |
| T-081 | `meeting_started_at` raw Meet string cast to `timestamptz`; long form fails; stored −5h30 | A:F-23, B:F-23 | 6 (after T-091) | Both shapes parse; stored value correct | ☐ |
| T-082 | `autoDecisions` files every non-exact row as `add_as_new` silently; display-name drift splits one person across two members | B:F-11 | 6 | Same person, two spellings, two files → one member | ☐ |
| T-083 | Multi-file batch progress held only in component state | B:F-13 | 6 | Abort after file 4 of 9 → remaining 5 discoverable | ☐ |
| T-084 | 12s `LOAD_TIMEOUT_MS` vs paged member fan-out; no `AbortController` → retries multiply in-flight work; paged read restarts from page 1 | A:F-33, C:RF-14, C:§7 | 6 | Spec: timeout aborts work | ☐ |
| T-085 | No list virtualized; `readBounded` unused | C:RF-10 | 6 | Render-count assertion at 5,000 rows | ☐ |
| T-086 | Two operators, same file → raw `23505` string reaches screen | B:C-1 | 6 | Two concurrent commits → `already_imported` sentence | ☐ |
| T-087 | Two files, one day → last writer wins, first operator's result screen false | B:C-2 | 6 | `supersedes` re-checked in transaction, returned | ☐ |
| T-088 | No optimistic concurrency on `update_member` / `set_member_status` / `set_member_active_from` | B:C-4, C:§11 | 6 | `updated_at` precondition refuses stale save | ☐ |
| T-089 | `bulkDeleteMembers` N sequential RPCs, no resume | C:RF-25 | 6 | `delete_members(uuid[])` returns per-member verdicts | ☐ |
| T-090 | `audit_logs` unbounded, on every member write path; no retention/partitioning | C:RF-18 | 6 — **owner decision on retention** | Partition plan before 10M rows | ☐ |
| T-091 | Register drift: `KL-005` describes replaced pager; no `RC-046` for 0071; `useScreenState` dead | RV-33, A:F-31 | 6 | Docs updated | ☐ |
| T-092 | FR fallout: `addMemberAlias` `:3263` no longer refuses another member's name; `aliasClaimedMessage` misreads; `supabase/apply_all.sql` stale | FR §11 | 6 | Wording spec; snapshot retired | ☐ |
| T-116 | **Gendered copy against the standing gender-neutral rule, on both send paths.** One RENDERED string: `app/send/index.tsx:583` — "No email address — she stays counted in every figure" — which is member-facing copy on screen. The rest are the comments the rule covers equally: `app/send/index.tsx:47,49,51,67,71,78,81,88,166,167,231,257`; `app/member/[id].tsx:37,41,48,49,55,57,58,97,105,111,113,137,190,203,205,228,229,251,252,502,546,552,553,555,556,600,657`; `src/data/sent.ts:37,44,89`. The academy is a women's academy; the software is not, and a licensee's copy must read correctly. Restructure rather than swapping the pronoun (`CLAUDE.md` standing rules) | `CLAUDE.md` standing rules; found while reading the T-017 call sites | 6 | Copy-lock on the rendered string; a spec that finds no `y(she|her|hers|herself)y` in the two send screens and `src/data/sent.ts` | ☐ Not fixed inline by T-017 — a pronoun sweep inside an idempotency-key PR is exactly the widening the loop forbids |
| T-093 | Scale programme not run (import 500/1,000/2,000/5,000; send 50/200/500; chaos 14–19) | A:§12, B:T-04/T-05, C:§23 | 6 | Phases 1–3 green at 2,000; chaos items defined+recoverable | ☐ |

## Gate 7 — P3 / polish (through a working pipeline, whenever there is slack)

| ID | Defect | Sources | Status |
|---|---|---|---|
| T-094 | `fetchAudit` orders by non-unique `occurred_at`, no `hasMore`; `readBounded` unused here | A:F-30 | ☐ |
| T-095 | `is_active` re-checked only on `restoreSession`; open tab keeps direct PostgREST reads | A:F-32 (state, don't fix) | ☐ |
| T-096 | `parseMinutes("1:30")` → 1 | A:F-34 | ☐ |
| T-097 | `generatePin` modulo bias (`buf[0] % 10000`) | A:F-36 | ☐ |
| T-098 | Non-constant-time HMAC compare `pin.ts:93` | A:F-37 | ☐ |
| T-099 | `manifest.webmanifest` cached with no invalidation | A:F-38 | ☐ |
| T-100 | Three theme/background colours across `app.json` and manifest | A:F-39 | ☐ |
| T-101 | `course_week_day_status` `marks` CTE counts cancelled/holiday sessions | A:F-41 | ☐ |
| T-102 | `fetchSenders` hardcoded; per-course sender never reaches SES | A:K-03 (TD-016) | ☐ |
| T-103 | `readMeta` `pick()` splits every line three times | B:F-22 | ☐ |
| T-104 | One address, two members, two opt-outs — documented per-course behaviour | B:F-25 — **owner decision** | ☐ |
| T-105 | Import-added addresses never validated; `unknown` status sent to and bounces | B:F-29 | ☐ |
| T-106 | Declined/failed previews accumulate as inert `csv_imports` rows | B:F-30 | ☐ |
| T-107 | Member deleted mid-send is still mailed; `member_stats` updated for deleted row | B:C-7 | ☐ |
| T-108 | CORS `*` on every function while `auth-lookup` is a public oracle | B:S-3 (documented) | ☐ |

## Verify before acting (Tier C — a read or benchmark promotes each to a row above)

| ID | Claim | Sources | What settles it | Status |
|---|---|---|---|---|
| V-01 | Matcher exceeds 2s Edge CPU at 2,000×2,000 | C:RF-02, RV-26 | Node benchmark of `_shared/match.ts` | ☐ |
| V-02 | 456-recipient send exceeds wall clock today | C:RF-11 model | Time at 50/200/500 with dev provider | ☐ |
| V-03 | Subxid overflow measurably degrades concurrent reads | C:RF-17 | `pg_stat_slru` during 500-row import | ☐ |
| V-04 | Alias name density forces row-by-row at 5,000 | C:RF-19 | Likely moot after 0073 (per-member uniqueness) — re-evaluate | ☐ |
| V-05 | `csv_imports.summary` reaches MBs | C:RF-22 | `pg_column_size` on a real preview | ☐ |
| V-06 | `meeting_started_at` long form fails / stored wrong | A:F-23, B:F-23 | `select distinct meeting_started_at … limit 20` vs source files | ☐ |
| V-07 | SNS fan-out saturates pool at 10,000 | C:RF-26 | Pool peak during large send | ☐ |
| V-08 | Edge body limit vs 10,000-row preview | C:§3 `[U]` | Probe at 1 MB / 5 MB | ☐ |
| V-09 | Reset-vs-upload race (`reset_day_attendance` vs concurrent commit) | B:C-3 | Targeted harness test | ☐ |
| V-10 | `expected_members_for_session` returns duplicate ids for any live session | A:V-8 | Run over recent sessions | ☐ |

## Verified sound — protect from regression, do not touch

`pageAllByKey` (RV-34, C:§19), `inChunks` / `MAX_IDS_PER_REQUEST=150` (RV-35), `useAsync` cancellation (RV-36), re-import of same file (RV-37), `refuse_course_duplicate` advisory lock — **the pattern to generalise** (RV-38), `set_attendance` scoped recompute (0035), `course_week_day_status` server-side aggregation (0067) — **the model for every heavy read**, `ses-feedback` idempotency and suppression logic, secrets posture, service worker, `app_users` column guard, attendance override semantics (0037/0042/0044/0045), change-notification wiring, Vercel static hosting.

---

## Accounting

**116 tracked rows** (T-001–T-117, with T-110 reserved and not yet filed — it is the triage of the 17 spec files still red in `db-harness`, which T-012 owns and which waits on T-013) **+ 10 verification items**, after de-duplication across RV (41), A (46), B (48), C (25) and FR, plus nine found while working the rows (T-109, T-111–T-117). Closed so far: 5 ticked (T-001, T-007, T-008, T-011, T-111), 1 not a defect (T-004). The raw sources overlap heavily — the same four P0s appear in all three audits under different IDs. The consolidated register's 75 (or 77) will map onto a subset of these rows; when it surfaces, add its ID to the *Sources* column of the matching row and open a row only for anything genuinely not here.
