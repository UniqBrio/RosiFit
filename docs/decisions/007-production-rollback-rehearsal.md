# 007 — A rolled-back rehearsal against production, when the harness cannot run

**Status:** Accepted · **Date:** 04-Sep-2026

## Context

`CLAUDE.md` is explicit and binding: *"Rehearsal is the local harness only. Replay every migration
from scratch against a fresh local Postgres 16 and run the full spec suite (`npm run test:db`).
That is the pre-flight check — the whole of it."*

ADR 005 established that the harness is runnable — on a machine with the PostgreSQL **server**
binaries, or in CI's `db-harness` job. Neither was available for `0027`: the machine this work
was done on has neither `psql` nor Docker, and the owner asked for a working Edit Member in the
same session.

`0026` was applied without a rehearsal on a reading of its SQL, and that was defensible: it drops
`NOT NULL`, drops an index, and re-issues two functions with one expression removed from each —
catalogue-only, nothing that rewrites a row. `0027` is a different object entirely. It is ~250
lines of plpgsql that ends enrolment rows, opens new ones, deletes and soft-deletes list members,
and does it under a GiST exclusion constraint on `(member_id, daterange)` with **inclusive**
bounds, where an off-by-one day is a constraint violation and an off-by-one *branch* silently
re-files attendance against the wrong course. Applying that on a reading is not a judgement call
anyone should be comfortable making.

## Decision

Where the harness cannot run and the work cannot wait, a migration whose risk is in its
**behaviour** may be rehearsed against production inside a single `DO` block that ends in
`RAISE EXCEPTION`.

A `DO` block is one transaction. Raising at the end aborts it, so every row the rehearsal
inserted, updated or deleted is rolled back by the database itself — not by a cleanup script that
can be forgotten, mis-scoped, or interrupted. The assertions are accumulated into a text variable
and carried out in the exception message, which is the only thing that survives.

The rehearsal for `0027` did this: created a scratch member enrolled 60 days ago, then exercised
the name change, both list reconciliations (including the normalisation case that must NOT churn),
the subset-rule refusal, the offering move, and clearing the override. 20 assertions, 19 passing —
the twentieth expected four audit rows from four calls when one of the four was a deliberate
refusal that correctly wrote none. Counts were re-read afterwards to confirm the rollback:
0 probe rows, and enrolments, schedules, aliases, emails, attendance and audit all back at their
prior values.

## Consequences

**What this proves that the harness cannot.** The harness holds no data. It proves a migration is
*well-formed by reconstruction*; it cannot prove the function behaves correctly against the rows
production actually has. `CLAUDE.md` says this itself: *"a migration that builds an index or adds
a constraint over existing rows needs that specific check run against production before it is
applied."* This is that check, generalised from constraints to behaviour.

**What it does NOT prove, and this is the important half.**

- It does not replay the migration from scratch. Nothing here shows `0001`–`0027` still build a
  correct schema in order on an empty database. Only CI does that.
- It does not run the committed spec. `supabase/tests/21_update_member.sql` has still never
  executed. The assertions in the rehearsal were written alongside it and cover the same ground,
  but they are not the same file, and it is the file that will be run again next time.
- It runs on the live database. A `DO` block holds its locks for its duration, and a bug that
  loops or blocks is a bug holding locks on production. The rehearsal must stay small and
  bounded, and it must touch only rows it created itself.

**So this is a supplement, not a replacement.** The CI `db-harness` job remains the rehearsal of
record, and `0027` is carried as owing it. `SETUP.md` says so at the point where somebody would
otherwise assume it had one.

## Options rejected

**Apply `0027` on a reading, as `0026` was.** Rejected: the two are not comparable. `0026` could
not corrupt a row if it tried; `0027`'s whole job is moving history.

**Hold `0027` until CI runs.** Reasonable, and rejected only because the owner asked for a working
Edit Member and there was a way to get real evidence first. Had the rehearsal failed any
assertion, this is what would have happened.

**Rehearse on a Supabase branch.** Not available: `CLAUDE.md` forbids creating Supabase branches
outright — *"All schema work targets the main Supabase project directly. There is no branch
environment, and one must not be introduced."*

**Write the scratch rows and delete them afterwards.** Rejected: cleanup that depends on a second
statement running is cleanup that does not happen when the first one errors, and it would leave
test members on a live register. The rollback has to be the database's, not the author's.
