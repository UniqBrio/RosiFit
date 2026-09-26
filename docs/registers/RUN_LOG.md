# Run log

> **What was asked, which kind of request it was, and what it cost.** One row per run,
> **newest first**, append-only — never renumber, never backfill silently, never hard-delete.
>
> **Rows are written by `scripts/run-log.mjs`, not by hand.** The two timestamps are read from
> the machine clock at the moment each event happens. A start time typed in at the *end* of a
> run is a recalled time, and a duration derived from two recalled times is an estimate wearing
> the costume of a record — which is precisely what [RC-008](./ROOT_CAUSE_REGISTER.md) cost
> this framework: "run reports carry stage timings" was a rule for three versions and produced
> **not one measured number**, because the only party asked to honour it was a narrator.
>
> ### Reading the Total column (v2.7.0)
>
> Rows from v2.7.0 read **`12m active · 3h 38m elapsed`**. Earlier rows carry one figure, and it
> is the **elapsed** one.
>
> They differ because an agent-run session spends much of its wall clock waiting for a person to
> read something and reply. R-006 recorded **3h 38m** for about fifteen minutes of work — the
> requester stepped away between two messages — and a column that silently measures a lunch
> break cannot answer the one question it exists for: *was it the machine or the agent?*
>
> **Active is a lower-bound estimate, not a measurement.** It sums the gaps between the marks
> the script leaves as it runs, counting at most 10 minutes of any single gap; work done between
> two marks further apart than that is not counted at all. A run with too few marks gets
> **`active: no marks`** rather than a flattering number — the same rule as everything else
> here: a figure nobody measured is never printed beside figures that were.
>
> **Elapsed is still recorded, always.** The honest answer to "how long did this take?" is
> different for the machine and for the calendar, so the row carries both.

> **Adopted into RosiFit 08-Sep-2026 (framework v1.25.0) with no rows; header re-seeded 16-Sep-2026
> from framework v4.0.0 (the v2.7.0 *Reading the Total column* section).** The header and columns
> are the framework's verbatim; the runs and timings it cites (R-006, the 87-second stack) were
> measured on the **framework** repository, not here. RosiFit's first row is written by the
> script, as `R-001`. **Since framework v2.0.0 guard G9 blocks a commit that changes application
> code while this file gains no new row** — close every run with `run-log.mjs end`, or say
> `RUNLOG-NA: <reason>` in the commit message.

```bash
node scripts/run-log.mjs start --type CHANGE --action "sign-out lands on the wrong screen" --scale micro
node scripts/run-log.mjs stage ground     # then: plan · build · verify · gate
#   … the run happens, marking each stage as it begins …
node scripts/run-log.mjs end --verdict PASS
node scripts/run-log.mjs status           # what is open, which stage, how long
```

**Mark a stage at its start, not its end.** Each stage runs until the next mark, so no
wall-clock falls between two stages unattributed. A total tells you a run was slow; the stage
breakdown is the only thing that tells you *what to fix*.

## The columns

| Column | What it holds |
|---|---|
| **ID** | `R-001`, ascending, never reused |
| **Action** | What the requester asked, **in their words** — not a summary of what was built |
| **Type** | The classification from [`workflows/request.md`](../../workflows/request.md) R1 |
| **Scale** | `micro` · `scoped` · `full-scale` · `n/a` — the lane the run declared |
| **Started · Ended** | Local time, read from the machine clock at each event |
| **Total** | Computed, never typed |
| **Stages** | `ground · plan · build · verify · gate`, each with its own measured duration. Only stages actually marked appear — **an unmarked stage is absent, never `0`**, because zero would claim the stage ran instantly rather than that nobody measured it |
| **Gate** | The gate's own measured cost, lifted from the newest `Time:` line in `TEST_SUMMARY.md` |
| **Verdict** | `PASS` · `FAIL` · `BLOCKED` — the three the gate has; there is no fourth |
| **Notes** | `back-filled start` when a row's start was supplied rather than measured, plus anything worth a phrase |

**Type** uses the same vocabulary as `/request` R1, deliberately — a second set of names for
one concern means two different answers to "how many bug runs did we do".

| Type | In plain words |
|---|---|
| `NEW-APP` | a whole new application |
| `NEW` | a new feature, in an app that already exists |
| `CHANGE` | a functionality correction — it works, it should behave or look different |
| `BUG` | a defect — erroring, wrong output, wrong data |
| `REFACTOR` | same behaviour, better structure |
| `TRIAGE` · `BRAINSTORM` · `FRAMEWORK` | a list to order · thinking it through · the process itself was repaired |

## Why `Total` and `Gate` sit next to each other

They answer the only question a slow run really raises: **was it the machine or the agent?**
Measured on this repository 08-Sep-2026, the entire mechanical stack — `audit:all` 17.7s,
`guard:test` 60.2s, `npm run gate` 8.6s — is about **87 seconds**. So a two-minute gap between
those two columns is the tooling, and a fifty-minute gap is not. Any proposal to speed up a run
should start by reading this table rather than by guessing which part felt slow.

---

| ID | Action | Type | Scale | Started | Ended | Total | Stages | Gate | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| R-023 | The old failing unit and database tests need a separate fix - Yes (T-023) | BUG | scoped | 2026-09-26 05:06 | 2026-09-26 05:06 | 0s elapsed · active: no marks | - | 26.0s | PASS | - |
| R-022 | The old failing unit and database tests need a separate fix - Yes (T-025) | BUG | micro | 2026-09-26 05:01 | 2026-09-26 05:01 | 0s elapsed · active: no marks | - | 26.0s | PASS | - |
| R-023 | Postnatal's wording has no visible unsubscribe line. Is that mandatory. If yes, add it. | CHANGE | scoped | 2026-09-26 04:51 | 2026-09-26 04:53 | 2m elapsed · active: no marks | - | 26.0s | PASS | - |
| R-022 | It would be easier if the user sees what content will be sent before hitting send button either using Send communication or Reach out button. Quickly show the message in the last screen where final send button exists. | CHANGE | scoped | 2026-09-26 04:28 | 2026-09-26 04:42 | 14m active · 15m elapsed | verify 11m | 26.0s | PASS | - |
| R-022 | old failing database tests - fix (T-133, owner: Accept it) | BUG | micro | 2026-09-26 05:20 | 2026-09-26 05:20 | 0s elapsed · active: no marks | - | 26.0s | PASS | - |
| R-022 | old failing database tests - fix (T-134 setup data) | BUG | micro | 2026-09-26 05:23 | 2026-09-26 05:23 | 0s elapsed · active: no marks | - | 26.0s | PASS | - |
| R-022 | old failing database tests - fix (T-135 roles) | BUG | micro | 2026-09-26 05:25 | 2026-09-26 05:25 | 0s elapsed · active: no marks | - | 26.0s | PASS | - |
| R-022 | old failing database tests - fix (T-136 weekday window) | BUG | micro | 2026-09-26 05:27 | 2026-09-26 05:27 | 0s elapsed · active: no marks | - | 26.0s | PASS | - |
| R-022 | old failing database tests - fix (T-137 stale specs) | BUG | micro | 2026-09-26 05:30 | 2026-09-26 05:30 | 0s elapsed · active: no marks | - | 26.0s | PASS | - |
| R-021 | When the email is sent using Reach out it triggers the old email template instead of using the latest corrected email content. One template for one course. Every course should follow its own template mentioned in course edit/create form, for Reach out and Send communication. | BUG | scoped | 2026-09-26 04:07 | 2026-09-26 04:16 | 10m active · 10m elapsed | ground 2m · verify 7m · gate 22s | 26.0s | PASS | - |
| R-020 | Review round on the same change: three blocking screen defects from code-reviewer, five copy defects from copy-gate-reviewer | CHANGE | scoped | 2026-09-24 06:46 | 2026-09-24 06:46 | 0s active · 0s elapsed | ground 0s · plan 0s · build 0s · verify 0s · gate 0s | 26.0s | FAIL | Gate 7/6, the same six pre-existing classes. Unit 1947 pass / 6 fail against a 1921/8 baseline: +24 tests, two fewer failures. Three blocking findings fixed (showPending's hand-kept key list, the section collapsed under its own filter, the header split losing a term) plus the guardrail-3 glyph, the blank-address tiebreak, and T-302's character windows paid down. |
| R-019 | Email issues takes the members it lists out of the roster above, and the dropdown gains Bounced and Unsubscribed | CHANGE | scoped | 2026-09-24 06:35 | 2026-09-24 06:38 | 3m active · 3m elapsed | ground 0s · plan 0s · build 0s · verify 3m · gate 0s | 25.9s | FAIL | Gate 7/6 — all six failures pre-existing and named in TEST_SUMMARY (G1/G2/G3 no design/tokens.json, G8 empty functional log, G6 one warning in scripts/conformance.mjs, G7 message.test.ts x5 + T-023). Unit suite 1938/6 against a 1921/8 baseline: +15 tests, two fewer failures. |
| R-018 | Email Issues section inside each Course, below No Email | NEW | scoped | 2026-09-24 06:04 | 2026-09-24 06:04 | 0s active · 0s elapsed | verify 0s | 28.3s | FAIL | - |
| R-017 | i added same email which was bounced earlier but it got added now instead of showing the message | BUG | scoped | 2026-09-24 04:45 | 2026-09-24 04:45 | 0s active · 0s elapsed | verify 0s | 29.5s | FAIL | - |
| R-016 | bounced email re-entry: warn and ask for a different address, do not reinstate | CHANGE | scoped | 2026-09-23 11:07 | 2026-09-23 11:08 | 31s active · 31s elapsed | verify 0s | 37.1s | FAIL | - |
| R-015 | Attendance import multiplies a namesake: ambiguous rows auto-added as new members | BUG | micro | 2026-09-22 19:32 | 2026-09-22 19:41 | 9m elapsed · active: no marks | - | 27.8s | FAIL | RC-107 import decisions: change-scoped checks green (types both programs, lint app+src, spec 18/18, unit 1860 pass / 8 known); gate FAIL on pre-existing G1-G3 (design/tokens.json absent), G6 (scripts/conformance.mjs warning), G7 (known 8), G8 (no environment) |
| R-014 | aplly to db | BUG | scoped | 2026-09-22 20:03 | 2026-09-22 20:03 | 0s active · 0s elapsed | verify 0s | 26.3s | FAIL | - |
| R-013 | take the suppressed-email fix through the remaining DB/application completion steps | BUG | scoped | 2026-09-22 19:44 | 2026-09-22 19:45 | 4s active · 4s elapsed | verify 0s | 29.1s | FAIL | - |
| R-012 | What is the root cause. I clicked on Edit button and then added email and then saved but its not reflecting why? | BUG | scoped | 2026-09-22 17:45 | 2026-09-22 18:38 | 23m active · 53m elapsed | ground 24m · build 26m | 28.4s | FAIL | - |
| R-011 | Dropdown panel shows four rows then scrolls | CHANGE | scoped | 2026-09-22 11:21 | 2026-09-22 11:22 | 26s elapsed · active: no marks | - | 46m 13s | PASS | typecheck, lint, unit at baseline; browser check by the requester |
| R-010 | Dropdown panel shows five rows then scrolls | CHANGE | scoped | 2026-09-22 11:14 | 2026-09-22 11:15 | 39s elapsed · active: no marks | - | 46m 13s | PASS | typecheck, lint, unit at the 8-failure RV-03 baseline; browser check by the requester |
| R-009 | Dropdown panel: always-visible scrollbar on web | CHANGE | scoped | 2026-09-22 11:09 | 2026-09-22 11:10 | 37s elapsed · active: no marks | - | 46m 13s | PASS | typecheck, lint, unit at the 8-failure RV-03 baseline; browser check deferred to the requester by instruction |
| R-008 | Close data freshness issue: stale-while-revalidate, lifecycle revalidation, missing bus subscriptions, honest upload progress, surface failed background refresh | CHANGE | n/a | 2026-09-22 07:29 | 2026-09-22 11:01 | 3h 32m elapsed · active: no marks | - | 46m 13s | PASS | back-filled start; gate exit 2 is the documented pre-existing state (G1-G3, G6-G8); unit suite at the 8-failure RV-03 baseline, no new failures; runtime-verified in the PWA against a stubbed backend; back-filled start |
| R-007 | Resolve the merge conflict on PR #22 (a/T-042-keyset) and land it on main | CHANGE | scoped | 2026-09-19 06:14 | 2026-09-19 06:44 | 30m elapsed · active: no marks | - | 46m 13s | FAIL | back-filled start; register conflict only; gate verdict identical to unmodified origin/main rung for rung (7 pass, 6 fail); db/harness replay green on the new 56_member_period_metrics_page.sql, 15 of 15; PR #34 was merged to main by another session mid-run and needed no work from here |
| R-006 | T-404: npm run check runs every check and collects the failures | CHANGE | n/a | 2026-09-19 11:52 | 2026-09-19 11:52 | 0s elapsed · active: no marks | - | 46m 13s | FAIL | check ran all 7 steps: lint, typecheck, check:edge, check:contrast, check:icons, check:functions PASS; test:unit FAIL on the 8 known RV-03 assertions. Contrast and icons executed for the first time in CI's lifetime. |
| R-005 | T-035: install eslint, wire lint into check, correct both CI files | CHANGE | n/a | 2026-09-18 17:31 | 2026-09-18 17:45 | 14m elapsed · active: no marks | - | 46m 13s | BLOCKED | gate BLOCKED on pre-existing G8 (courses.tsx filter, T-023); G6 lint now runs - eslint installed by this change |
| R-004 | T-038: config.toml pins verify_jwt for all eleven Edge Functions | CHANGE | n/a | 2026-09-18 16:36 | 2026-09-18 16:37 | 1m elapsed · active: no marks | - | 43.2s | BLOCKED | gate BLOCKED on pre-existing G6 (ESLint uninstalled, T-035) and G8 (courses.tsx filter, T-023); check:functions green, 11 functions declared |
| R-003 | T-020: a refused email_messages insert fails that recipient, not the batch | CHANGE | n/a | 2026-09-18 16:27 | 2026-09-18 16:27 | 9s elapsed · active: no marks | - | 22.3s | BLOCKED | gate BLOCKED on pre-existing G6 (ESLint uninstalled, T-035) and G8 (courses.tsx filter, T-023); Edge Function specs 3/3 green in CI run 35333793846 |
| R-002 | apply db part as well + Build pop up as well | CHANGE | scoped | 2026-09-16 15:20 | 2026-09-16 15:20 | 7s active · 7s elapsed | build 7s | 22.2s | - | - |
| R-001 | In attendnace section show inactive members at bottom and on click of inactive tag a pop up should be appearing as mark as active same which is shown for clciking active but allow user to select active from date in pop up and by default the date should be todays date | CHANGE | scoped | 2026-09-16 12:24 | 2026-09-16 14:43 | 31m active · 2h 19m elapsed | ground 43m · build 21m · verify 1m | 18.7s | - | - |
