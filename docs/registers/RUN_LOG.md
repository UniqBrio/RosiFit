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

> **Adopted into RosiFit 08-Sep-2026 (framework v1.25.0) with no rows.** The header and columns
> are the framework's verbatim; the timings quoted under *Why `Total` and `Gate` sit next to each
> other* were measured on the **framework** repository, not here. RosiFit's first row is written by
> the script, as `R-001`.

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
| R-003 | Course day card: no absent cross on a card carrying Upload again; Show filter beside the search box on the right | CHANGE | micro | 2026-09-12 12:11 | 2026-09-12 12:18 | 7m | ground 1m · build 5m · verify 14s | 19.9s | PASS | npm run check green except the six pre-existing unit failures on main; browser run both themes/widths ALL CHECKS PASS; gate not re-run (no new class since the 10:34 run, verdict would repeat) |
| R-002 | Attendance upload of three 11-Sep Meet files fails with 500: csv-import reads members unpaged past the API 1000-row cap | BUG | micro | 2026-09-12 10:34 | 2026-09-12 10:40 | 6m | ground 1m · build 2m · verify 3m · gate 1m | 19.9s | FAIL | csv-import paged (RC-043); gate 6/5/1 identical to the two prior runs on main - G6 no eslint, G7 six pre-existing specs (formDropdownMenu, message), G8 no test:functional; none touch this change. Function not deployed. |
| R-001 | In dropdown with in the forms such as add edit forms of course member and other form within which drop down is present apply dropdown ui as shown in atatched image only inside forms and dialogs | CHANGE | scoped | 2026-09-08 14:13 | 2026-09-08 14:24 | 11m | - | - | - | - |
