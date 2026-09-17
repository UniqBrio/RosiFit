# Claude Code kickoff — RosiFit remediation

## Before the first session (you, by hand, once)

1. Copy `RosiFit_Remediation_Work_Order_v2.md` → `docs/registers/REMEDIATION_WORK_ORDER.md`
2. Copy `RosiFit_Issue_Tracker.md` → `docs/registers/ISSUE_TRACKER.md`
3. Commit both on `main` with message `docs: remediation work order v2 + issue tracker (17-Sep-2026)`. This commit is exempt from the freeze; it is the freeze.
4. Add one line to `CLAUDE.md`, under its standing rules:
   > Remediation is governed by `docs/registers/ISSUE_TRACKER.md`. Work rows in gate order, one row per PR, per the loop in that file. Every merged PR has an `RC-nnn` entry.

## Session 1 prompt (paste this)

```
Read docs/registers/REMEDIATION_WORK_ORDER.md and docs/registers/ISSUE_TRACKER.md in full before doing anything.

Then:
1. Confirm back to me, in three lines, which gate is current, which row is next, and what the row's Proof column requires. Do not start until I say go.
2. Standing rules for every session:
   - One tracker row per branch and PR. Branch name fix/T-nnn.
   - Failing test first. If the Proof column names a test, that test. If it names none, you write it and it is the first commit.
   - Anything new you find gets a new tracker row, never an inline fix.
   - Every PR includes the RC-nnn entry in docs/registers/ROOT_CAUSE_REGISTER.md, using the template in the tracker. "Why it shipped" and "Class" are mandatory and must be specific.
   - Migrations: additive only, new number, never edit a historical file, apply via `supabase db query --linked -f` then `supabase migration repair`, never `db push`. Show me the raw SQL and wait for my explicit go before any production apply — CLAUDE.md's standing rule holds.
   - Production reads (Gate 0 rows) only when I have named the row in this session. Read-only, and paste the result into the tracker row.
   - Cite evidence as RV-nn / A:F-nn / B:F-nn / C:RF-nn / FR. No historical F-nn without the letter.
   - When a row is done: tick it in ISSUE_TRACKER.md with PR#, date, RC-nnn; one line in RUN_LOG.md.
3. Gate 0 rows T-001 through T-010 may run in parallel with Gate 1. Start with T-007 today — I want to know whether any import has succeeded since 16 September.
```

## Every later session prompt

```
Read docs/registers/ISSUE_TRACKER.md. State the current gate, the next open row, and its Proof requirement. Wait for go.
```

## What you watch for

- Claude Code proposing to "also fix" something in the same PR → refuse; row it.
- A tick without an RC entry → reopen it.
- An RC entry whose "Class" says "only this site" for a mechanism that obviously exists elsewhere (an unchunked `.in()`, a discarded error, a bare RLS call) → send it back to enumerate.
- Any request to run `db push`, edit a historical migration, or touch production without you saying go → no.
- Gate 2 exit is the moment the feature freeze lifts. Not before. It will feel slow. It is the fix.
