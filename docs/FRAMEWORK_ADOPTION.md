# Framework Adoption Log

> **Newest first. Append-only.** The template says this file is written by `upgrade.mjs --apply`;
> here it was written by hand, because **RosiFit was never scaffolded** — `upgrade.mjs` and
> `lineage.mjs` have no seed to diff against and were deliberately not run.
>
> The "deferred and why" line is the whole point of this file. At two-digit app counts, the real
> failure is not tooling — it is an app stuck on an old version **with nobody remembering why**.
> This file is the cheap fix, and it only works if it is kept from the first upgrade.

**Skew policy** (framework `docs/22-FRAMEWORK-EVOLUTION.md`): stay within **2 MINOR** versions of
current; adopt a **MAJOR** within one quarter.

---

## v1.36.1 — adopted 11-Sep-2026 (from: v1.25.0, via 1.26 · 1.27 · 1.28 · 1.29 · 1.30 · 1.31 · 1.32 · 1.33 · 1.34 · 1.35 · 1.36)

### What kind of adoption this is

**Half A (PROCESS) only, by hand** — the same method as every pass since v1.6.0: compare each
upstream-changed process file against framework **v1.25.0**, replace only what is still
**byte-identical**, never overwrite a file RosiFit has changed.

**Scope held: nothing under `app/`, `src/`, `supabase/`, `assets/`, `db/`, `design/` or
`.harness/` was touched.** Asserted mechanically from `git status`, not by inspection.

### Auto-applied — pristine in RosiFit, changed upstream (27)

`FRAMEWORK_MANIFEST.md` · `UPGRADES.md` · `VERSION` · `checklists/DESIGN_QUALITY_CHECKLIST.md` ·
`checklists/SCREEN_CHECKLIST.md` · `docs/00` · `docs/02` · `docs/04` · `docs/17` · `docs/23` ·
`docs/registers/COMPONENT_LIBRARY.md` (pristine since v1.11.0) · **`scripts/lib/ratchet.mjs`**
(1.32.0 — see below) · `scripts/audits/check-column-control.mjs` (1.29.0: `<th scope="row">`
is a row header, not a column) · **`scripts/gate-runner.mjs`** (1.30.0–1.32.0: application
subtree via `appPath`, `--app`, `--logdir`, tree fingerprint, **G12**, blocked-trend notice) ·
`scripts/par.mjs` (exit 3 reported as BLKD, never FAIL) · `scripts/theme-build.mjs` ·
`scripts/close-out.mjs` + `.test.sh` · `scripts/conformance.mjs` · `scripts/gate-timing.test.sh` ·
`scripts/lib/lineage.mjs` · `scripts/new-app.mjs` · `scripts/upgrade.test.sh` ·
`tests/cases/FRAMEWORK_PROCESS_CASES.md` · `workflows/feature.md` · `workflows/promote.md` ·
`workflows/request.md`

### Added — new since v1.25.0 (11 files, 1 baseline)

`1_AppDevelopmentSteps.md` (1.36.1, the plain-English path) ·
`scripts/audits/check-pwa-baseline.mjs` + `scripts/pwa-baseline.test.sh` (1.31.0, gate G12) ·
`scripts/capture-candidate.mjs` + `.test.sh` (1.36.0) · `scripts/gate-scope.test.sh` (1.30.0) ·
`scripts/lib/png.mjs` · `scripts/lib/shpath.sh` + `scripts/shpath.test.sh` (1.34.0, CP-31) ·
`scripts/ratchet.test.sh` (1.32.0) · `scripts/theme-build.test.sh` (1.30.0).

**`.baselines/pwa-baseline.txt`** — G12 arrives baselined, the way every ratchet has here since
v1.3.0: 2 entries (`offline.missing` — no `public/offline.html`; `sw.unregistered` — nothing in
`src/` registers the worker). Both are honest facts about an Expo PWA whose install surface is
`app.json`, not the framework's `public/` shape; recorded as known debt, so G12 blocks only
*new* regressions.

### The one behavioural change worth reading twice — 1.32.0

`scripts/lib/ratchet.mjs`: **a ratchet with no baseline now exits 3 (BLOCKED), not 0.** It
used to print "this gate is INERT" and pass — the exact false green RosiFit recorded as
framework defect **F-3 / TD-007** at v1.3.0. That defect is now fixed upstream, and this pass
carries the fix. Impact here, **checked before replacing the file**: every audit RosiFit's
`audit:all` runs has a baseline (colours · testIDs · rules · columns · dead weight · fixture
leak, both trees), `check-audit-attribution.mjs` does not use the ratchet library, and the
commit guard invokes no ratchet audit. **Proven after**: all eleven audit invocations exit 0 —
"none new" on every one. Nothing went red.

### Skipped, with the reason

| File(s) | Why |
|---|---|
| `.github/workflows/github-actions-ci.yml` | Upstream's *installed copy* of its CI template. RosiFit has its own `.github/workflows/ci.yml` (with the `db-harness` job, ADR 013) |
| `ci/github-actions-ci.yml` | RosiFit's copy was adapted at v1.3.0 and differs; upstream's template rewrite (calls `audit:all` + `guard:test`, adds a Windows self-test job) is a merge for the owner |
| `.gitignore` · `package.json` · `CHANGELOG.md` · `TEST_SUMMARY.md` · `CLAUDE.md` | RosiFit's own (CLAUDE.md: version reference only). Upstream ignores `starter/package-lock.json` — N/A here. Upstream adds `audit:pwa` and `capture` scripts and five suites to `guard:test` — see Known gaps |
| `docs/registers/*` (7 files) | RosiFit's own. Upstream: **CP-26** delete contract · **CP-27** audit trail · **CP-28** undo · **CP-29** pricing · **CP-30** installability · **CP-31** shell→JS paths · CP-18 amended · **DR-3** selected tab · RC-008…RC-012 · RUN_LOG rows R-004…R-006. RosiFit numbers its own (ADR 002); CP-26 (Delete that archives is a lie the user acts on) is the one to read against `app/member/[id].tsx` and the archive migrations 0047–0052 |
| `fixtures/` (3 files) | Framework self-test fixtures; RosiFit has none (conformance deferred since v1.3.0) |
| `starter/` (68 files) | Half B seed; RosiFit has no `starter/` |

### App action required — checked one by one

Eleven releases, all MINOR except 1.36.1 PATCH. Every entry records "Nothing" / "None"
mechanically. 1.32.0's condition ("if your app has a baseline for every gate it uses") holds —
verified above. 1.33.0's three "worth a look" items concern starter seed files (`config.ts`,
`next.config.mjs`, `eslint.config.js`) RosiFit does not have. 1.29.0's `BulkBar` behaviour
change is a starter component RosiFit does not use.

### Verification — executed here, not read

| Suite | Result |
|---|---|
| eleven ratchet/audit invocations under the new `ratchet.mjs` | **all exit 0, none new** |
| `guard-reachability.test.sh` (guard resolves the replaced `theme-build.mjs`) | **17 / 17** |
| `ratchet.test.sh` | **9 / 9** |
| `capture-candidate.test.sh` | **14 / 14** — registers untouched |
| `close-out.test.sh` (re-run, file changed) | **30 / 30** |
| `shpath.test.sh` | **6 / 7** — the one failure reads `starter/design/tokens.json`, absent here; `jsurl`, the sweep and the plant-and-catch cases pass |
| `gate-scope.test.sh` | **12 / 17** — the five failures assert the framework layout (`starter/` as the application subtree, G1 green); the twelve behavioural cases (no-baseline → BLOCKED with a duration, `--logdir`, fingerprint, blocked-trend, `--only` never PASS) pass |
| `gate-timing.test.sh` (re-run) | **6 / 8** — unchanged from v1.25.0: the two failures assert G1 passes (ADR 001) |
| `pwa-baseline.test.sh` · `theme-build.test.sh` | **SKIPPED, audibly** — both need `starter/design/tokens.json` |
| `gate-runner.mjs --only G4,G9,G11,G12 --summary <scratch> --logdir <scratch>` | runs in this layout: "Application steps ran in ."; G4 · G9 · G11 PASS; G12 BLOCKED before the baseline, **PASS after**; `TEST_SUMMARY.md` untouched (hash compared) |
| `npm run check` | **not run** — `node_modules/` absent in the adopting session; nothing under `src/` or `app/` changed |

### Known gaps in this adoption — owner edits, all in files this pass was told not to touch

1. **`package.json`**: add `"audit:pwa": "node scripts/audits/check-pwa-baseline.mjs"` and
   `&& npm run audit:pwa` to `audit:all`; the four `package.json` gaps from v1.20.0 and v1.25.0
   still stand (`audit:fixtures`, `fanout`/`run-log`/`review-plan`/`close-out` suites in
   `guard:test`). Suites worth adding now: `ratchet.test.sh`, `capture-candidate.test.sh`,
   `shpath.test.sh`. **Not** `gate-scope`, `gate-timing`, `pwa-baseline`, `theme-build` — each
   needs the starter, and a suite that always fails or always skips is one nobody reads.
2. **`.gitignore`**: still needs `.run-log.json` and `.close-out-commit.txt` (from v1.25.0).
3. **`ci/github-actions-ci.yml`**: upstream's template now calls `audit:all` and `guard:test`
   instead of enumerating audits (RC-009). Worth porting into RosiFit's `.github/workflows/ci.yml`
   by hand.

Recorded here so each is a decision, not an oversight.

---

## v1.25.0 — adopted 08-Sep-2026 (from: v1.20.0, via 1.21 · 1.22 · 1.23 · 1.24)

### What kind of adoption this is

**Half A (PROCESS) only, by hand** — the same method as every pass since v1.6.0: compare each
upstream-changed process file against framework **v1.20.0**, replace only what is still
**byte-identical**, never overwrite a file RosiFit has changed.

**Scope held: nothing under `app/`, `src/`, `supabase/`, `assets/`, `db/`, `design/` or
`.harness/` was touched.** Asserted mechanically from `git status`, not by inspection.

### Auto-applied — pristine in RosiFit, changed upstream (16)

`.claude/commands/framework-update.md` · `FRAMEWORK_MANIFEST.md` · `UPGRADES.md` · `VERSION` ·
`docs/00-OVERVIEW.md` · `docs/01-SDLC.md` · `docs/16-TESTING-AND-VALIDATION.md` ·
`docs/registers/COMPONENT_LIBRARY.md` (pristine since v1.11.0) · **`scripts/gate-runner.mjs`**
(1.23.0: every step timed, total and slowest step named; decides exactly as before) ·
`tests/cases/FRAMEWORK_PROCESS_CASES.md` · `workflows/agents/README.md` · `workflows/bug.md` ·
`workflows/feature.md` · `workflows/framework-update.md` · `workflows/request.md` ·
`workflows/test-gate.md` (1.23.0: the verification lane by scale)

### Added — new since v1.20.0 (9 scripts, 1 register, 2 baselines)

- `scripts/audits/check-fixture-leak.mjs` (1.22.0) · `scripts/gate-timing.test.sh` (1.23.0) ·
  `scripts/run-log.mjs` + `scripts/run-log.test.sh` (1.24.0) · `scripts/par.mjs` ·
  `scripts/review-plan.mjs` + `.test.sh` · `scripts/close-out.mjs` + `.test.sh` (1.25.0).
- **`docs/registers/RUN_LOG.md` — seeded empty, not copied.** `run-log.mjs end` refuses to run
  without the register ("restore it rather than let this script invent one"), so a copy of the
  script without the file would be a dead tool. The framework's file carries three rows of
  *its own* runs (R-001…R-003) and a note about them; those were removed and a one-paragraph
  provenance note added. Header, columns and vocabulary are the framework's verbatim.
  RosiFit's first row will be `R-001`.
- **`.baselines/fixture-leak-baseline.txt`** (src: 2 named placeholders —
  `SAMPLE_ROWS` in `memberXlsx.ts`, `SAMPLE_MEMBER` in `message.ts`) and
  **`.baselines/fixture-leak-app-baseline.txt`** (app: 0 — a **clean gate**). Written by the
  audit's own `--write-baseline`, the same way the five ratchets were baselined at v1.3.0, so
  the gate is green the day it is wired and blocks only *new* leaks.

### Merged — the one file RosiFit had changed (1)

`checklists/DEFINITION_OF_DONE.md`: RosiFit added the RC-023 item (a CHECK constraint stated by
the form) after v1.20.0; upstream added *The run log* section. Non-overlapping hunks;
`git merge-file` three-way against v1.20.0 applied cleanly with zero conflict markers. Both
items are present.

### Skipped, with the reason

| File(s) | Why |
|---|---|
| `.gitignore` | RosiFit's own. Upstream ignores `.run-log.json` (the open-run marker) and `.close-out-commit.txt`. **Add those two lines before the first `run-log start`**, or the marker will show up in `git status` — see Known gaps |
| `package.json` | RosiFit's own. Upstream rewires `audit:all` and `guard:test` through `par.mjs` (concurrent, every failure aggregated) and adds `audit:fixtures`, `runlog`, `review:plan`, `closeout`, plus `:serial` variants — see Known gaps |
| `CHANGELOG.md` · `TEST_SUMMARY.md` | RosiFit's own logs |
| `docs/registers/CANONICAL_PATTERNS.md` | Upstream: **CP-25** (an edit surface loads the record before it renders) and **CP-15 amended** (a date arriving by import/paste/API). RosiFit numbers its own patterns (ADR 002). CP-25 is directly relevant to `app/member/edit.tsx` and `app/course/edit.tsx` — a RosiFit-numbered row is an owner decision |
| `docs/registers/DESIGN_RULES.md` | Upstream's first rows are **DR-1 sentence case** and **DR-2 a session ends when the user says so** — and RosiFit already has its own **DR-1…DR-5** (the five guardrails). Same IDs, different rules; a copy would silently rename RosiFit's rules. Owner decision: adopt as DR-6/DR-7 if wanted |
| `docs/registers/ROOT_CAUSE_REGISTER.md` | RosiFit's register (RC-013 onward are RosiFit's). Upstream's RC-007 (seventeen escaped defects) is framework history |
| `starter/` (7 files) | Half B seed; RosiFit has no `starter/` |

`CLAUDE.md` (expected-divergent) gained only the version reference.

### App action required — checked one by one

All five releases are MINOR; each records "App action required: None". 1.22.0 adds a new
audit that "arrives baselined" — done above. 1.25.0 notes `audit:all` and `guard:test` changed
shape upstream; RosiFit's are its own and unchanged.

### Verification — executed here, not read

| Suite | Result |
|---|---|
| `scripts/run-log.test.sh` | **32 passed, 0 failed** — scratch registers only; `docs/registers/RUN_LOG.md` untouched, no stray `.run-log.json` |
| `scripts/review-plan.test.sh` | **20 passed, 0 failed** |
| `scripts/close-out.test.sh` | **23 passed, 0 failed** — no stray `.close-out-commit.txt` |
| `scripts/gate-timing.test.sh` | **6 passed, 2 failed — expected here, not a regression.** The suite runs the real gate with `--only G1` and asserts G1 *passes*. In RosiFit G1 has no input (no `design/tokens.json`, ADR 001 / F-1) and reports FAIL, so the two assertions about G1 being green cannot hold. All six assertions about the **timing feature itself** (total stated, slowest step named, per-step durations, `-` for a step that never ran, verdict line intact) pass |
| `check-fixture-leak.mjs` src + app | OK against the new baselines: 2 known, 0 new · 0 known — clean gate |
| `check-rule-coverage.mjs` · `check-dead-weight.mjs` | OK, unchanged (1 known · clean) |
| `npm run check` | **not run** — `node_modules/` absent in the adopting session; nothing under `src/` or `app/` changed |

### Known gaps in this adoption — three, all one-line `package.json` / `.gitignore` edits the owner makes

1. **`audit:fixtures` is baselined but not wired.** Add to `package.json`:
   `"audit:fixtures": "node scripts/audits/check-fixture-leak.mjs --dirs src && node scripts/audits/check-fixture-leak.mjs --dirs app --baseline .baselines/fixture-leak-app-baseline.txt"`
   and append `&& npm run audit:fixtures` to `audit:all`.
2. **Four executed suites are not in `guard:test`** (with `fanout-check.test.sh` from v1.20.0,
   five). Either append them, or adopt upstream's shape:
   `node scripts/par.mjs "guards=bash scripts/hooks/guard-reachability.test.sh" "fanout=bash scripts/fanout-check.test.sh" "run-log=bash scripts/run-log.test.sh" "review-plan=bash scripts/review-plan.test.sh" "close-out=bash scripts/close-out.test.sh"`
   — `gate-timing.test.sh` deliberately **left out** until G1 has an input here (it would fail
   2/8 on every run, and a suite that always fails is one nobody reads).
3. **`.gitignore` needs `.run-log.json` and `.close-out-commit.txt`** before `run-log.mjs` or
   `close-out.mjs` are used.

Recorded here so each is a decision, not an oversight.

---

## v1.20.0 — adopted 06-Sep-2026 (from: v1.11.0, via 1.12 · 1.13 · 1.14 · 1.15 · 1.15.1 · 1.16 · 1.17 · 1.18 · 1.19)

### What kind of adoption this is

**Half A (PROCESS) only, by hand** — the same method as every pass since v1.6.0. Every process
file changed upstream was compared against framework **v1.11.0** first; only files still
**byte-identical** to it were replaced with their **v1.20.0** version.

**Scope held: nothing under `app/`, `src/`, `supabase/`, `assets/`, `db/`, `design/` or
`.harness/` was touched.** Asserted mechanically from `git status`, not by inspection.

### Auto-applied — pristine in RosiFit, changed upstream (35)

Ten `.claude/agents/*.md` (descriptions gated to the 1.15.0 review matrix) ·
`FRAMEWORK_MANIFEST.md` · `README.md` · `UPGRADES.md` · `VERSION` ·
`checklists/DEFINITION_OF_DONE.md` · `checklists/DESIGN_QUALITY_CHECKLIST.md` ·
`checklists/SCREEN_CHECKLIST.md` · `docs/00` · `docs/01` · `docs/04` · `docs/21` · `docs/23` ·
`docs/24` · `docs/registers/COMPONENT_LIBRARY.md` (pristine since v1.11.0; §1 gains
Lists & tables and Analytics as baseline concerns) · **`scripts/hooks/pre-commit-guard.sh`** ·
**`scripts/hooks/guard-reachability.test.sh`** · `templates/gates/GATE1_QUESTIONS.md` ·
`templates/requests/REQUEST_CHANGE.md` · `templates/requests/REQUEST_NEW.md` ·
`tests/cases/FRAMEWORK_PROCESS_CASES.md` · `workflows/agents/README.md` · `workflows/bug.md` ·
`workflows/enhance.md` · `workflows/feature.md` · `workflows/request.md`

### Added — new since v1.11.0 (4)

`.claude/agents/implementation-builder.md` (1.20.0, the parallel-build agent) ·
`docs/25-ANALYTICS-AND-DASHBOARDS.md` (1.18.0) · `scripts/fanout-check.mjs` +
`scripts/fanout-check.test.sh` (1.20.0, the parallel-plan validator and its executed cases).

### Skipped, with the reason (6 groups)

| File(s) | Why |
|---|---|
| `.codex/` (12 agent TOMLs, hook adapter, `hooks.json`) | `FRAMEWORK_MANIFEST.md` says it plainly: *framework-repo wiring today, not yet in `HALF_A`, so scaffolds do not carry it*. RosiFit does not run Codex; adding a second hook adapter nobody executes is a dead gate |
| `AGENTS.md` | A pointer to `CLAUDE.md` that also points at `.codex/`, which RosiFit does not have. Expected-divergent path. Adding it is a one-line owner decision once Codex is in use here |
| `CHANGELOG.md` | RosiFit's own changelog |
| `docs/registers/CANONICAL_PATTERNS.md` | Upstream adds **CP-23** (every list searchable / filterable / sortable) and **CP-24** (analytics as a module). RosiFit's register superseded the framework rows at adoption (ADR 002) and numbers its own; both rungs point at `starter/` specs RosiFit does not have. RosiFit-numbered equivalents are a `/promote`-style owner decision |
| `package.json` | RosiFit's own. Upstream wires `fanout:check` and adds `fanout-check.test.sh` + `.codex/hooks/adapter.test.sh` to `guard:test`. **Not wired here** — see Known gap below |
| `starter/` (24 files: ListControls, ModuleAccessPanel, ModuleCustomizer, the analytics module, their specs, `tsconfig.json`) | Half B seed. RosiFit has no `starter/`; a component wanted here is copied deliberately, by a `/request`, not by an upgrade |

`CLAUDE.md` (expected-divergent) gained only the version reference.

### App action required — checked one by one

- **1.15.1 (PATCH, the only listed app action):** delete `"//strict"` / `"//paths"` keys from
  the app's `tsconfig.json`. **N/A** — RosiFit's `tsconfig.json` is its own (extends
  `expo/tsconfig.base`) and contains neither key (grep count 0).
- **1.19.0 — `pre-commit-guard.sh` changed:** guard **G8** verifies a `SCALE: micro` claim
  against the diff (≤ 2 source files, no migration, no new component, no `package.json`).
  **Opt-in by claim** — a commit that does not say `SCALE: micro` is untouched. Carried, and
  proven to fire here (below).
- **1.15.0 — `.claude/agents/*.md` changed:** carried; RosiFit runs the copied wiring.
- Every other release: none.

### Verification — executed, not read

- `bash scripts/hooks/guard-reachability.test.sh` — **17 passed, 0 failed**, including all
  seven G8 cases (blocks 3 files / schema / new component / dependency; passes 2 files + test
  + doc; `MICRO-NA:` releases; silent when not claimed). Run inside this repository.
- `bash scripts/fanout-check.test.sh` — **11 passed, 0 failed.**
- `node scripts/audits/check-rule-coverage.mjs` — OK, 1 known violation, none new (unchanged).
- `node scripts/audits/check-dead-weight.mjs` — OK, clean gate; the two new scripts are
  referenced (by each other and by `workflows/feature.md`), so nothing was flagged.
- `npm run check` — **not run**: `node_modules/` absent in the adopting session; nothing under
  `src/` or `app/` changed, so its inputs are identical to before this pass.

### Known gap in this adoption

**`fanout-check.test.sh` passes but is not yet in `npm run guard:test`.** Wiring it is one
edit to `package.json` — an app-owned file this pass was told not to touch. Until the owner
adds `&& bash scripts/fanout-check.test.sh` to `guard:test` (and optionally
`"fanout:check": "node scripts/fanout-check.mjs"`), the suite runs only by hand. Recorded here
so it is a decision, not an oversight.

---

## v1.11.0 — adopted 05-Sep-2026 (from: v1.7.0, via 1.8.0 · 1.9.0 · 1.10.0)

### What kind of adoption this is

**Half A (PROCESS) only, by hand** — the same method as v1.6.0 and v1.7.0. Every process file
changed upstream was compared against framework **v1.7.0** first; only files still
**byte-identical** to it were replaced with their **v1.11.0** version.

**Scope held: nothing under `app/`, `src/`, `supabase/`, `assets/`, `db/`, `design/` or
`.harness/` was touched.** Asserted mechanically from `git status`, not by inspection.

### Auto-applied — pristine in RosiFit, changed upstream (21)

`.claude/commands/feature.md` · `.claude/commands/request.md` · `FRAMEWORK_MANIFEST.md` ·
`README.md` · `UPGRADES.md` · `VERSION` · `checklists/DEFINITION_OF_DONE.md` ·
`docs/00-OVERVIEW.md` · `docs/01-SDLC.md` · `docs/02-PROJECT-INITIALIZATION.md` ·
`docs/24-DESIGN-PLANNING.md` · `scripts/new-app.mjs` · `templates/gates/GATE1_QUESTIONS.md` ·
`templates/requests/REQUEST_CHANGE.md` · `templates/requests/REQUEST_NEW.md` ·
`tests/cases/FRAMEWORK_PROCESS_CASES.md` · `workflows/enhance.md` · `workflows/feature.md` ·
`workflows/promote.md` · `workflows/refactor.md` · `workflows/request.md`

### Added — new in v1.11.0 (1)

`docs/registers/COMPONENT_LIBRARY.md` — the component registry. Added because it is **new**
(nothing of RosiFit's was overwritten), `workflows/feature.md` A3.1 and the DoD now read it,
and `check-rule-coverage.mjs` does **not** parse it, so the rule-coverage ratchet is
unaffected. Its §3 reference stack (`typescript-react-postgres`, seeded from the framework's
`starter/`) is **not RosiFit's stack** (React Native Expo PWA): RosiFit reads §1 (the
standard baseline) as-is, and a `react-native-expo-supabase` subsection is a future
contribute-back, not something this pass invents.

### Skipped — app-owned (1)

| File | Why |
|---|---|
| `CHANGELOG.md` | RosiFit's own changelog; framework entries do not belong in it |

`CLAUDE.md` (expected-divergent) gained only the version reference.

### App action required — none mechanically, one behavioural note

All four releases are MINOR and `UPGRADES.md` records "no gate, baseline, or guard changed".
**But 1.9.0 changed a default:** a Track A/B/D run with no `RUN MODE` stated now runs in
**auto** — gates 1–4 become checkpoints whose open decisions are taken on the written
recommendation and logged to the run's ASSUMPTIONS ledger, with the review moved to the end.
A requester who wants every gate to wait writes `RUN MODE: confirm` in the request file or
says so. The hard stops that survive auto (destructive ops, capability removal, the safety
floor, outbound sends, **production — Gate 6 is human in every mode**) and the mechanical
test gate are unchanged; RosiFit's own BINDING rules in `CLAUDE.md` (PROD SQL shown and
approved first, one migration at a time) are unaffected.

1.8.0's NEW-APP route fires only when no scaffolded codebase exists — never here.
1.10.0's product-advisor pass fires only for a new module, and is a hard stop in every mode.

### Verification

- `node scripts/audits/check-rule-coverage.mjs` — OK, 1 known violation, none new (unchanged).
- `node scripts/audits/check-dead-weight.mjs` — OK, clean gate (unchanged).
- `npm run check` — **not run**: `node_modules/` absent in the adopting session; nothing under
  `src/` or `app/` changed, so its inputs are identical to before this pass.
- Deferred list unchanged from v1.3.0.

---

## v1.7.0 — adopted 05-Sep-2026 (from: v1.6.0)

### What kind of adoption this is

**Half A (PROCESS) only, by hand** — the same method as v1.6.0. Every process file changed
upstream was compared against framework **v1.6.0** first; only files still **byte-identical** to
it were replaced with their **v1.7.0** version. Files RosiFit owns were left untouched.

**Scope held: nothing under `app/`, `src/`, `supabase/`, `assets/`, `db/`, `design/` or
`.harness/` was touched.** Asserted mechanically from `git status`, not by inspection.

### Auto-applied — pristine in RosiFit, changed upstream (13)

`FRAMEWORK_MANIFEST.md` · `README.md` · `UPGRADES.md` · `VERSION` ·
`checklists/ACCESSIBILITY_CHECKLIST.md` · `checklists/SCREEN_CHECKLIST.md` (item 4 merged;
still 20, still full) · `docs/00-OVERVIEW.md` · `docs/01-SDLC.md` ·
`docs/04-ARCHITECTURE-AND-DESIGN.md` · `docs/13-CONTRAST-AND-ACCESSIBILITY.md` ·
`tests/cases/FRAMEWORK_PROCESS_CASES.md` · `workflows/enhance.md` · `workflows/feature.md`

### Added — new in v1.7.0 (3)

`docs/23-DESIGN-CRAFT.md` · `docs/24-DESIGN-PLANNING.md` · `checklists/DESIGN_QUALITY_CHECKLIST.md`

### Skipped — app-owned or Half B (4)

| File | Why |
|---|---|
| `CHANGELOG.md` | RosiFit's own changelog; framework entries do not belong in it |
| `docs/registers/CANONICAL_PATTERNS.md` | Upstream adds **CP-22 Keyboard operability**. RosiFit's register superseded the framework CP rows at adoption (ADR 002) and numbers its own from CP-001; the upstream row names `src/components/TabRow.tsx` and `Dialog.tsx`, which do not exist here. A RosiFit-numbered row is a `/promote`-style decision for the owner, not an auto-copy |
| `docs/registers/DESIGN_RULES.md` | Upstream created an **empty, armed** register. RosiFit already has one (DR-1…DR-5, created at adoption) — the file exists, is parsed by `check-rule-coverage.mjs`, and must not be overwritten |
| `starter/tests/functional/keyboard.functional.spec.ts` | Half B seed. RosiFit has no `starter/`; the spec is a reference shape to point at RosiFit's own screens and observe failing first |

`CLAUDE.md` (expected-divergent) gained only the version reference.

### App action required

**None** — 1.7.0 is MINOR; `UPGRADES.md` records "no gate, baseline, or guard changed". The
design-intelligence layer (docs/23, docs/24, the design-quality checklist, keyboard parity in
Track A's A3.8/A3.9 and Track B's correction pass) applies to the **next** design run.

### Verification

- `node scripts/audits/check-rule-coverage.mjs` — OK, 1 known violation, none new (unchanged).
- `node scripts/audits/check-dead-weight.mjs` — OK, clean gate (unchanged).
- `npm run check` — **not run**: `node_modules/` absent in the adopting session; nothing under
  `src/` or `app/` changed, so its inputs are identical to before this pass.
- Deferred list unchanged from v1.3.0.

---

## v1.6.0 — adopted 04-Sep-2026 (from: v1.3.0)

### What kind of adoption this is

**Half A (PROCESS) only, by hand.** Same reason as the first adoption: RosiFit has no
`.framework/lineage.json`, so `upgrade.mjs` was not run. The three-way rule was applied
manually instead — every process file was first compared against framework **v1.3.0** (the
version this copy was taken from), and only files that were **byte-identical** to it were
replaced with their **v1.6.0** version. Files RosiFit had changed since were left untouched.

**Scope held: nothing under `app/`, `src/`, `supabase/`, `assets/`, `db/`, `design/` or
`.harness/` was touched.** Asserted mechanically from `git status`, not by inspection.

### Auto-applied — pristine in RosiFit, changed upstream (10)

`FRAMEWORK_MANIFEST.md` · `README.md` · `UPGRADES.md` · `VERSION` · `docs/00-OVERVIEW.md` ·
`docs/01-SDLC.md` · `docs/21-AGENT-WIRING.md` · `workflows/bug.md` · `workflows/enhance.md` ·
`workflows/feature.md`

### Added — new in v1.4.0 to v1.6.0 (7)

`workflows/request.md` · `.claude/commands/request.md` · `requests/README.md` ·
`templates/requests/REQUEST_NEW.md` · `templates/requests/REQUEST_CHANGE.md` ·
`templates/requests/REQUEST_BUG.md` · `tests/cases/FRAMEWORK_PROCESS_CASES.md`

### Skipped — app-owned, and RosiFit's copy already differs from v1.3.0 (3)

| File | Why |
|---|---|
| `CHANGELOG.md` | RosiFit's own changelog; the framework's entries do not belong in it |
| `TEST_SUMMARY.md` | Append-only gate log of this repository; the upstream change is a framework gate run |
| `CLAUDE.md` | Expected-divergent. Only the framework version reference and the runbook row (adding `/request` and the `requests/` ledger) were edited |

Not changed upstream, so not considered: `.claude/commands/gate.md` (RosiFit addendum),
`.claude/settings.json` (RosiFit git guard), `ci/github-actions-ci.yml`, `docs/registers/`.

### App action required

**None** — every entry from 1.4.0 to 1.6.0 is MINOR and `UPGRADES.md` records "App action
required: None" for each. No gate, baseline or guard changed. `/request` is a new optional
entry point; every track still accepts a plain one-line request.

### Verification

- `node scripts/audits/check-rule-coverage.mjs` — OK, 1 known violation, none new (unchanged).
- `node scripts/audits/check-dead-weight.mjs` — OK, clean gate (unchanged).
- `npm run check` — **not run**: `node_modules/` is absent in the adopting session and nothing
  under `src/` or `app/` changed; the gate's inputs are byte-identical to before this pass.
- Deferred list unchanged from v1.3.0: `conformance` · `audit:compat` · `theme:build` /
  `theme:check` · `theme:assets`.

---

## v1.3.0 — adopted 02-Sep-2026 (from: nothing — this is the first adoption)

### What kind of adoption this is

**Half A (PROCESS) only.** RosiFit was bootstrapped from a *copy* of the framework and then
diverged; it was not produced by `new-app.mjs`. There is no `starter/`, no `fixtures/`, no
`design/tokens.json`, no `.baselines/` and no `.framework/lineage.json`.

That single fact drives every decision below. The framework's day-one promise is *nothing is
blocked that was not already broken*, and honouring it on an adopted app means wiring only what
can execute and recording the rest, rather than switching on gates whose inputs do not exist.

**Scope held: adopt + baseline + registers. No application code was changed.** Nothing under
`app/`, `src/`, `supabase/`, `assets/`, `db/`, `design/` or `.harness/` was touched.

### Auto-applied

- **0 files.** There is no lineage to compare against, so nothing could be auto-applied. `npm run
  lineage` and `npm run upgrade` were not wired and not run — inert without a seed.

### Wired

Ten npm scripts, each pointing only at something that can actually execute here:
`gate` · `theme:contrast` · `audit:colors` · `audit:testids` · `audit:rules` · `audit:columns` ·
`audit:deadweight` · `audit:all` · `guard:test` · `guard:install`.

The nine pre-existing app scripts were not modified, and `npm run check` is byte-for-byte
unchanged.

### Deferred, with the condition that revives each (4)

| Deferred | Why | Revived when |
|---|---|---|
| `conformance` | Framework self-test; needs `fixtures/` and `starter/` | never, for an app repo — it belongs to the framework |
| `audit:compat` | Same. Worse than absent here: it exits 0 while printing `INERT`, a false green | the framework separates skipped from passed (F-3) |
| `theme:build` / `theme:check` | Needs `design/tokens.json`; colour is `src/theme/tokens.ts` (ADR 001) | RosiFit adopts a JSON token source, or the framework accepts a TypeScript one |
| `theme:assets` | Needs declared per-theme assets; RosiFit declares none | the first per-theme brand asset is introduced |

Wiring any of them would add a script whose only possible outcome is BLOCKED, which is how a gate
teaches people to ignore it.

### New gates baselined at current state

Adoption step 2 of `docs/17-ENFORCEMENT-RATCHETS.md` §8 — see the damage, freeze it, then the
gates block only *new* violations.

| Ratchet | `src/` | `app/` |
|---|---|---|
| Hard-coded colours | 7 files | 13 files |
| testID coverage | 6 files / 22 elements | 29 files / 93 elements |
| Column control | 0 — **clean gate** | 0 — **clean gate** |
| Rule coverage | 1 (RC-003) | — |
| Dead weight | 0 — **clean gate** | — |

Three of the eight are already clean gates and can never regress silently.

`--dir` is single-valued, so every audit that takes one runs **twice**. `src/` holds the *default*
baseline paths because `gate-runner.mjs` passes no `--dir` and would otherwise find no baseline at
all; `app/` uses distinct paths. `npm run audit:all` covers both trees and is what CI runs.

**The testID figures are the whole backlog, not a sample:** every interactive element in the
repository lacks one. Paying that down is deliberately *not* in this pass. The ratchet is what
turns it into a later, gated queue instead of a cleanup sprint — and because the ratchet is
two-sided, the list can only shrink.

### Registers

- `CANONICAL_PATTERNS.md` — framework `CP-1…CP-21` **superseded, not deleted** (ADR 002). All 21
  rows kept verbatim in `_archive/CANONICAL_PATTERNS.framework-v1.md`, marked
  SUPERSEDED-AT-ADOPTION. Twenty of the twenty-one named files that do not exist here. RosiFit's
  own patterns start at **CP-001**; sixteen blessed, each naming a file that exists today.
- `DESIGN_RULES.md` — **created.** `check-rule-coverage.mjs` expects it and the repo lacked it. It
  restates CLAUDE.md's five binding guardrails in the form the audit can read, each naming its rung.
- `ROOT_CAUSE_REGISTER.md` — left as-is. RC-001…006 are inherited framework history and the
  registers are append-only; RC-003's one dead rung is baselined (TD-009). Deliberately different
  from the CP decision **on cost, not principle**: one dead rung is cheap to carry, twenty was not.
- `FEATURE_TRUTH.md` · `RBAC_MATRIX.md` · `ENVIRONMENTS.md` · `TEST_ACCOUNTS.md` — filled from
  facts already in this repo. See the commit for what each one found.
- `DECISION_LOG.md` — 12 entries, `docs/decisions/` ADRs 001–004 created.
- `TECH_DEBT.md` — 10 rows, one per accepted-unverifiable class plus the baselined backlog.

**Rule coverage went from 20 dead rungs to 1.**

### Post-adoption gate verdict

**`npm run gate` → FAIL, exit 2.** 5 pass, 5 fail, 1 blocked.

*The upgrade is done when the gate gives a verdict, not when files land.* This one gives FAIL, and
that is the honest state rather than a failure of the adoption: five of the eleven steps have no
input in this repository, and the runner reports "input absent" as "code broken".

| | |
|---|---|
| Genuinely green | G4 colours · G5 types · G9 testIDs · G11 columns |
| Correctly BLOCKED | G6 lint (no ESLint) |
| Input absent, misreported as FAIL | G1 · G2 · G3 (no `design/tokens.json`) · G7 · G8 (no test scripts) |
| **Green but meaningless** | **G10 — printed `INERT`, exited 0, compared nothing** |

Each has a DECISION_LOG entry and a TECH_DEBT row. An unrecorded blocked gate is
indistinguishable from a forgotten one.

**The verdict that can be quoted:** `npm run check` green (types + 2,800 contrast pairs + 71
icons) and `npm run audit:all` green across both trees. `.claude/commands/gate.md` carries an
addendum recording exactly this, so its documented contract and its observed behaviour no longer
disagree silently.

### Five framework defects found — `/promote` candidates, not patched locally

Found by running the gate rather than reading it. All five live in Half A, which an app may not
edit; the framework's own rule is that needing to edit a process file is the signal to run
`/promote`, not to fork.

- **F-1 — a missing input is reported as a broken codebase.** `theme-build.mjs` and its two
  siblings throw a raw `ENOENT` and exit 1; `gate-runner.mjs`'s `UNAVAILABLE` list does not match
  `Error: ENOENT`, so the step is classified FAIL. The runner's own header says that distinction
  "is not pedantry: a FAIL says *your code is broken* when the truth is *this machine cannot check
  it*."
- **F-2 — `--silent` hides the string the classifier greps for.** G7/G8 run
  `npm run --silent test:unit`. npm's `Missing script:` **is** in `UNAVAILABLE`, but `--silent`
  suppresses it, so `.gate-logs/G7.log` and `G8.log` come back **empty** and a missing suite is
  reported as a failing one.
- **F-3 — an inert gate reports PASS.** `check-backward-compat.mjs` prints `this gate is INERT and
  is telling you so` and exits 0, which the runner reads as PASS. Root cause: `RATCHET_SKIP = 0`
  is right for a commit guard that must never block on a tooling gap, and wrong under a runner
  that maps 0 to PASS. Two consumers, one exit code.
- **F-5 — the documented contract and the runner disagree on the exit code for an unverifiable
  class, so the three-valued verdict collapses to two.** `gate.md` defines exit `3` / BLOCKED as
  *"a class could not be verified — an owner decision, never a pass"*. In practice the runner
  reaches `3` only if a step itself exits `3`, and none here do: five unverifiable classes exit
  `2` / FAIL instead. The consequence is not cosmetic — **the owner is never actually asked to
  accept a BLOCKED class**, because the gate calls it a failure. F-5 is downstream of F-1, F-2 and
  F-3: fix those three and exit `3` becomes reachable and the contract becomes true. TD-011.
- **F-4 — `gate-runner.mjs` cannot gate an app whose code is not all under `src/`.** It passes no
  `--dir`, and `--dir` is single-valued anyway. RosiFit's 30 screens live in `app/`, so the gate
  never sees roughly two-thirds of the codebase. It should accept a repeatable `--dir` or read its
  roots from configuration (ADR 004, TD-008).

### Known gaps in the adoption itself

- **`guard:install` was wired but not executed.** The `.claude/settings.json` PreToolUse hook
  already runs the guard in every session; installing the git hook as well is a separate,
  reversible action left to the repo owner.
- **The DB harness could not be run.** Neither `psql` nor Docker is on PATH on the adopting
  machine, so `bash db/harness/test.sh` aborts in `reset.sh` and the 124 assertions were not
  executed. This was already true before the pass and nothing here touched `supabase/` or
  `db/harness/`. TD-010.

  > **Superseded 02-Sep-2026 — ADR 013.** That was a property of the adopting machine, not
  > of this repository: Debian and Ubuntu keep `initdb`, `postgres` and `pg_ctl` off `PATH`,
  > under `/usr/lib/postgresql/<major>/bin`, so a complete Postgres 16 reads as absent. On a
  > machine with the server binaries the suite runs unmodified and **all 135 assertions
  > pass** — over a socket and over TCP. `db/harness/start.sh` and the `db-harness` job in
  > `.github/workflows/ci.yml` keep it that way. TD-010 is paid down.

---

## Verification pass — 02-Sep-2026, same branch

> Run after the adoption commits above, on `chore/framework-adoption`. Five items. **Three pass,
> one is BLOCKED, and one assertion inside item 2 fails** — recorded rather than fixed forward.

### 1. Every ratchet was proven to bite ✅

Each audit was given a synthetic violation in a scratch directory (`.tmp-ratchet-proof/`, never
`src/` or `app/`), with a scratch baseline so the real ones were never touched. Both halves of the
two-sided contract were exercised.

| Audit | Scoped by | New violation | Fixed-but-still-listed | Verdict |
|---|---|---|---|---|
| hardcoded-colors | `--dir` | exit 2 — blocks | exit 2 — blocks | PASS |
| testid-coverage | `--dir` | exit 2 — blocks | exit 2 — blocks | PASS |
| column-control | `--dir` | exit 2 — blocks | exit 2 — blocks | PASS |
| rule-coverage | `--registers` | exit 2 — blocks | exit 2 — blocks | PASS |
| dead-weight | `--dirs` | exit 2 — blocks | exit 2 — blocks | PASS |

**No ratchet had to be declared UNPROVABLE.** The two audits without a `--dir` were provable
without editing a real register: `check-rule-coverage.mjs` accepts `--registers` and
`check-dead-weight.mjs` accepts `--dirs`, so both were pointed at scratch input instead. That is
strictly safer than the temporary-edit-and-revert fallback, because no tracked file was ever left
in a modified state.

Scratch directory deleted; `git status` clean and `.baselines/` byte-identical afterwards.

### 2. `npm run gate` end to end — FAIL, exit 2 ⚠️

Reproduced exactly as recorded in ADR 003: 5 pass, 5 fail, 1 blocked. Report prepended to
`TEST_SUMMARY.md`; step logs in `.gate-logs/`.

**The assertion "every accepted-BLOCKED rung reports as blocked and does not silently pass" does
NOT hold, and the failure is G10.**

| Accepted class | Reports as | Silent? |
|---|---|---|
| G1 · G2 · G3 | FAIL | no — loud, but misclassified (F-1) |
| G6 | BLOCKED | no — the only correctly classified step |
| G7 · G8 | FAIL, **empty log** | no — loud, but misclassified (F-2) |
| **G10** | **PASS** | **YES — it silently passes** |

G10 prints `this gate is INERT and is telling you so`, exits 0, and the runner records PASS. Six of
the seven accepted classes are at least loud about it; G10 is not, and a false green is worse than
a red step. Not fixed here: `check-backward-compat.mjs` and `lib/ratchet.mjs` are Half A. TD-007,
promote candidate F-3.

**Diff against `.claude/commands/gate.md`:** the RosiFit addendum added in this pass matches the
observed run row for row, so the command's documentation and its behaviour now agree. The
framework's contract table above the addendum still does not: it defines exit `3` / BLOCKED as the
verdict for a class that could not be verified, and here five such classes produce exit `2` /
FAIL. **That residual disagreement is a finding, left in place** — patching the local copy would
launder a framework defect into app configuration, and it would never be fixed upstream.

### 3. `check-rule-coverage.mjs` does not descend into `_archive/` ✅

Settled by reading the source, and it is structural rather than incidental: `REGISTERS` is a
literal three-path list (line 32), overridable only by `--registers`, and the rule-parsing loop
iterates that list. There is no directory walk in the rule path. Confirmed empirically by the
post-supersession count — **20 dead rungs to 1** — which could not happen if the 21 archived rows
were still being read.

The single `readdirSync` (line 101) is the rung-*existence* basename fallback. It does walk the
repository, but it searches for the basenames of claimed rung paths, never for register files, so
a markdown archive cannot revive a rung. **Q2 is resolved.** The standing constraint is recorded
in the archive header: never archive a file whose basename matches a rung-claimed source file.

### 4. Green checks — two green, one BLOCKED ⚠️

- `npm run check` gives **exit 0**. Types clean, **2,800/2,800** contrast pairs, **71/71** icons.
  Identical to the pre-pass baseline.
- `npm run audit:all` gives **exit 0**, both trees, all five ratchets.
- `bash db/harness/test.sh` is **BLOCKED, not run.** Neither `psql` nor Docker is on PATH on this
  machine; it aborts in `reset.sh` at `psql: command not found`. **The 124 assertions were not
  executed, and the same-count comparison could not be made.**

  > **Superseded 02-Sep-2026 — ADR 013.** That was a property of the adopting machine, not
  > of this repository: Debian and Ubuntu keep `initdb`, `postgres` and `pg_ctl` off `PATH`,
  > under `/usr/lib/postgresql/<major>/bin`, so a complete Postgres 16 reads as absent. On a
  > machine with the server binaries the suite runs unmodified and **all 135 assertions
  > pass** — over a socket and over TCP. `db/harness/start.sh` and the `db-harness` job in
  > `.github/workflows/ci.yml` keep it that way. TD-010 is paid down.

  This was measured **before** any commit on this branch and failed identically then, so it is a
  pre-existing environment gap, not a regression. This pass changed nothing under `supabase/` or
  `db/`, so the harness precondition ("if you touch anything DB-adjacent") is N/A for the change
  itself. TD-010. It remains an unverified class and is recorded as one rather than waved through.

### 5. Scope held ✅

`git diff --stat main...HEAD` gives **26 files, 1,264 insertions, 134 deletions.**

**Zero changed paths under `app/`, `src/`, `supabase/`, `assets/`, `design/`, `.harness/` or
`db/`.** Asserted mechanically, not by inspection.

Everything changed is process: `.baselines/` (8) · `docs/registers/` (8) · `docs/decisions/` (4) ·
`docs/FRAMEWORK_ADOPTION.md` · `ci/` · `.claude/commands/` · `package.json` · `.gitignore`.

### Definition of done

`checklists/DEFINITION_OF_DONE.md`, closed item by item. The large N/A block is itself the finding:
this pass changed no application code, which is exactly what it promised.

| Section | Status |
|---|---|
| Code — traces to request, no unrequested scope | ✅ every changed line traces to an approved queue item |
| Code — canonical pattern per concern | ✅ CP-001 to CP-016 blessed in this pass |
| Code — no colour literals / magic numbers | **N/A** — no application code changed |
| Code — dead weight deleted | ✅ `audit:deadweight` is a clean gate, 0 unreferenced |
| Code — dependencies verified and pinned | **N/A** — none added; `npm ci` from the existing lockfile |
| Behaviour — states, loading, failure paths, writes, transactions | **N/A** — no runtime behaviour changed |
| Appearance — screen checklist, both themes | **N/A** — no UI changed |
| Appearance — contrast asserted | ✅ 2,800 pairs green before and after |
| Security — five permission questions, matrix row | ✅ `RBAC_MATRIX.md` backfilled for every policy through `0014` |
| Security — no secret in code, log or repo | ✅ `.env.example` unchanged; no secret added |
| Tests — cases added, registry delta | **N/A** — no behaviour to case. The ratchet proofs are this pass's evidence |
| Tests — fail-first evidence | ✅ every ratchet was **observed failing** on a synthetic violation before being trusted |
| Tests — gate ran; verdict PASS, or BLOCKED classes named | ⚠️ **verdict FAIL.** All classes named, each with a DECISION_LOG entry and a TECH_DEBT row |
| Documentation — module doc, feature register, root cause, limitations, decision record | ✅ four registers filled, four ADRs written, adoption log instantiated |
| Documentation — changelog in the language of the user | **N/A** — nothing user-visible changed |
| Business readiness — tier stated | **T0.** No user-visible surface is affected |
| The learning check — would a correct process have caught this? | ✅ **Yes, and it did.** Running the gate rather than reading it surfaced F-1 to F-4. Four `/promote` candidates raised instead of four local patches |

---

## Register template residue removed — 02-Sep-2026, same branch

A sweep of `docs/` for surviving scaffolding. **This is not an append-only violation**: a
placeholder row is the template's illustration of a row, not a register entry. It is the same
class as the `CANONICAL_PATTERNS` archive — removing scaffolding, not history. Nothing with an
issued ID, a date, or an author was touched.

**Removed (2)** — both single placeholder rows in registers this adoption had not otherwise
touched, each leaving a valid header-only table plus an explicit statement that the register is
empty, so it reads as a fact rather than as an oversight:

| File | Removed |
|---|---|
| `docs/registers/KNOWN_LIMITATIONS.md` | the `_KL-001_ / _e.g. iOS Safari_ / …` illustration row |
| `docs/registers/PRODUCT_LEXICON.md` | the `_e.g. a recurring amount owed_ / _Monthly fee_ / … / _DD-MMM-YYYY_` illustration row |

**Kept, deliberately — these are content, not residue (3):**

- `docs/registers/ROOT_CAUSE_REGISTER.md:14–38` — `RC-000 — <one-line title>` and its
  `DD-MMM-YYYY`. This sits inside a fenced ```` ```markdown ```` block under a heading that reads
  **Template**: it is the register's own instructions for writing an entry. Deleting it would
  remove the documentation, not the scaffolding. `check-rule-coverage.mjs` already skips fenced
  blocks by design — *"a fenced block is a TEMPLATE or an example, not a rule definition"* — so it
  was never counted as a rule and never affected the ratchet.
- `docs/registers/CANONICAL_PATTERNS.md:52` (and its archive copy) — `rung: <path>` in the
  **Adding a row** instructions. Live guidance for the next author.
- `docs/03-PROJECT-STRUCTURE.md:107` — `<name>.taxonomy.ts`, a naming-convention illustration in a
  reference document, not a register placeholder.

**Searched for and not present (6).** These were expected but had already been removed by the
register rewrites earlier in this pass, when `FEATURE_TRUTH`, `RBAC_MATRIX`, `ENVIRONMENTS` and
`TEST_ACCOUNTS` were replaced wholesale rather than edited: the literal `<Module name>`,
`_example:`, `_test-owner@example.test_`, duplicated `Legend:` lines (one occurrence),
duplicated numbered rules in `ENVIRONMENTS.md` (rules 1–5 appear once each) and in
`TEST_ACCOUNTS.md` (rules 1–7 appear once each), and duplicated table header rows (none; no two
consecutive identical lines exist anywhere in `docs/registers/`).

---
